from flask import Flask, request, jsonify
from flask_cors import CORS
from google_play_scraper import reviews_all
from transformers import pipeline, AutoConfig
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime, timedelta
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor
from urllib.parse import urlparse, parse_qs
import torch

app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": "http://localhost:5173"}})

# Load VADER for compound scores
vader_analyzer = SentimentIntensityAnalyzer()

# Load Zero-shot Classifier (BART for categorization)
try:
    config = AutoConfig.from_pretrained("facebook/bart-large-mnli")
    config.label2id = {
        "Feature Requests": 0,
        "Bugs": 1,
        "UX/UI": 2,
        "Navigation Issues": 3,
        "Performance": 4,
        "Others": 5
    }
    config.id2label = {v: k for k, v in config.label2id.items()}
    
    categorization_model = pipeline(
        "zero-shot-classification",
        model="facebook/bart-large-mnli",
        config=config,
        device=0 if torch.cuda.is_available() else -1,
        batch_size=2048
    )
except Exception as e:
    print(f"Model loading error: {str(e)}")
    categorization_model = None

def extract_app_id(url):
    try:
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        if parsed_url.netloc != "play.google.com" or "id" not in query_params:
            return None
        return query_params["id"][0]
    except Exception as e:
        print(f"URL parsing error: {str(e)}")
        return None

def get_reviews(app_id):
    try:
        reviews = reviews_all(
            app_id,
            lang="en",
            country="us",
            count=1000,
            sleep_milliseconds=500
        )
        return [
            {
                "content": review["content"],
                "date": review["at"].strftime("%Y-%m-%d") if "at" in review else "N/A"
            }
            for review in reviews
        ]
    except Exception as e:
        print(f"Scraper error: {str(e)}")
        return []

def get_sentiment_label(review_content):
    try:
        vader_scores = vader_analyzer.polarity_scores(review_content)
        compound_score = vader_scores['compound']
        
        if compound_score >= 0.5:
            return 'Delighted'
        elif compound_score >= 0.1:
            return 'Happy'
        elif compound_score <= -0.5:
            return 'Angry'
        elif compound_score <= -0.1:
            return 'Frustrated'
        else:
            return 'Neutral'
    except Exception as e:
        print(f"Sentiment analysis error: {str(e)}")
        return 'Neutral'

def analyze_sentiment(reviews):
    sentiment_counts = defaultdict(int)
    for review in reviews:
        label = get_sentiment_label(review["content"])
        sentiment_counts[label] += 1
    return dict(sentiment_counts)

def categorize_feedback(reviews):
    if not categorization_model:
        return {
            "Feature Requests": 0,
            "Bugs": 0,
            "UX/UI": 0,
            "Navigation Issues": 0,
            "Performance": 0,
            "Others": 0
        }
    
    candidate_labels = [
        "Feature Requests",
        "Bugs",
        "UX/UI",
        "Navigation Issues",
        "Performance",
        "Others"
    ]
    texts = [review["content"] for review in reviews]
    
    results = categorization_model(
        texts,
        candidate_labels,
        multi_label=False,
        batch_size=2048
    )
    
    categories = defaultdict(int)
    total_reviews = len(reviews)
    
    for i in range(total_reviews):
        scores = results[i]['scores']
        labels = results[i]['labels']
        max_score_index = scores.index(max(scores))
        category = labels[max_score_index]
        
        # Post-processing logic to handle specific keywords
        if "opened not Able to go back" in texts[i].lower() or "force exit" in texts[i].lower():
            category = "Bugs"
        
        categories[category] += 1
    
    for category in categories:
        categories[category] = round((categories[category] / total_reviews) * 100, 2) if total_reviews > 0 else 0
    
    return dict(categories)

def calculate_sentiment_trends(reviews, period="1y"):
    trends = defaultdict(lambda: {
        "Delighted": 0,
        "Happy": 0,
        "Neutral": 0,
        "Frustrated": 0,
        "Angry": 0
    })
    
    cutoff = datetime.now()
    if period == "1y":
        cutoff -= timedelta(days=365)
    elif period == "6m":
        cutoff -= timedelta(days=180)
    elif period == "3m":
        cutoff -= timedelta(days=90)
    elif period == "1m":
        cutoff -= timedelta(days=30)
    elif period == "1w":
        cutoff -= timedelta(days=7)
    
    for review in reviews:
        date_str = review["date"]
        if date_str == "N/A":
            continue
        
        review_date = datetime.strptime(date_str, "%Y-%m-%d")
        if review_date < cutoff:
            continue
        
        label = get_sentiment_label(review["content"])
        trends[date_str][label] += 1
    
    return dict(trends)

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        app_url = request.json.get('url', '')
        period = request.json.get('period', '1y')
        
        if not app_url:
            return jsonify({"error": "No URL provided"}), 400

        app_id = extract_app_id(app_url)
        if not app_id:
            return jsonify({"error": "Invalid URL"}), 400

        reviews = get_reviews(app_id)
        if not reviews:
            return jsonify({
                "error": "No reviews found",
                "sentiment": {
                    "Delighted": 0,
                    "Happy": 0,
                    "Neutral": 0,
                    "Frustrated": 0,
                    "Angry": 0
                },
                "categories": {
                    "Feature Requests": 0,
                    "Bugs": 0,
                    "UX/UI": 0,
                    "Navigation Issues": 0,
                    "Performance": 0,
                    "Others": 0
                },
                "trends": {},
                "feedback": []
            }), 404

        # Calculate sentiment
        sentiment = analyze_sentiment(reviews)
        
        # Categorize feedback (batch processing)
        categories = categorize_feedback(reviews)
        
        # Calculate trends
        trends = calculate_sentiment_trends(reviews, period)
        
        # Prepare feedback samples using batch results
        categorized_feedback = []
        if categorization_model:
            candidate_labels = [
                "Feature Requests",
                "Bugs",
                "UX/UI",
                "Navigation Issues",
                "Performance",
                "Others"
            ]
            texts_for_samples = [review["content"] for review in reviews[:10]]
            sample_results = categorization_model(
                texts_for_samples,
                candidate_labels,
                multi_label=False,
                batch_size=10
            )
            
            for i, review in enumerate(reviews[:10]):
                scores = sample_results[i]['scores']
                labels = sample_results[i]['labels']
                max_score_index = scores.index(max(scores))
                category = labels[max_score_index]
                
                # Post-processing logic to handle specific keywords
                if "opened not Able to go back" in review["content"].lower() or "force exit" in review["content"].lower():
                    category = "Bugs"
                
                categorized_feedback.append({
                    "content": review["content"],
                    "category": category,
                    "solution": "N/A",
                    "count": 1
                })
        else:
            categorized_feedback = [
                {
                    "content": review["content"],
                    "category": "N/A",
                    "solution": "Model not found",
                    "count": 1
                }
                for review in reviews[:10]
            ]
        
        return jsonify({
            "sentiment": sentiment,
            "categories": categories,
            "trends": trends,
            "feedback": categorized_feedback
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "sentiment": {
                "Delighted": 0,
                "Happy": 0,
                "Neutral": 0,
                "Frustrated": 0,
                "Angry": 0
            },
            "categories": {
                "Feature Requests": 0,
                "Bugs": 0,
                "UX/UI": 0,
                "Navigation Issues": 0,
                "Performance": 0,
                "Others": 0
            },
            "trends": {},
            "feedback": []
        }), 500

if __name__ == '__main__':
    app.run(debug=True)