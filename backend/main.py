from flask import Flask, request, jsonify
from google_play_scraper import reviews_all
from transformers import pipeline
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime, timedelta
from collections import defaultdict
from urllib.parse import urlparse, parse_qs
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": "http://localhost:5173"}})

# Load Sentiment Analysis Model (5-level using VADER)
vader_analyzer = SentimentIntensityAnalyzer()

# Load Feedback Categorization Model (Hugging Face)
try:
    categorization_model = pipeline(
        "zero-shot-classification",
        model="facebook/bart-large-mnli",
        multi_class=True  # Enable multi-class classification
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
    except Exception:
        return None

def get_reviews(app_id):
    try:
        reviews = reviews_all(
            app_id,
            lang="en",
            country="us",
            count=1000  # Fetch more reviews for better analysis
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
        
        if compound_score >= 0.3:  # Lowered threshold from 0.6
            return 'Happy'
        elif compound_score <= -0.3:  # Lowered threshold from -0.6
            return 'Frustrated'
        else:
            return 'Neutral'
    except Exception as e:
        print(f"Sentiment analysis error: {str(e)}")
        return 'Neutral'

def analyze_sentiment(reviews):
    sentiment_counts = {
        "Happy": 0,
        "Neutral": 0,
        "Frustrated": 0
    }
    
    for review in reviews:
        label = get_sentiment_label(review["content"])
        sentiment_counts[label] += 1
    
    return sentiment_counts

def categorize_feedback(reviews):
    if not categorization_model:
        return {
            "Feature Requests": 0,
            "Bugs": 0,
            "UX/UI": 0,
            "Performance": 0,
            "Others": 0
        }
    
    try:
        candidate_labels = ["Feature Requests", "Bugs", "UX/UI", "Performance", "Others"]
        
        categories = defaultdict(int)
        total_reviews = len(reviews)
        
        for review in reviews:
            result = categorization_model(
                review["content"],
                candidate_labels,
                multi_class=True  # Ensure multi-class classification
            )
            max_score_index = result['scores'].index(max(result['scores']))
            category = result['labels'][max_score_index]
            
            categories[category] += 1
        
        # Calculate percentages
        for category in categories:
            categories[category] = round((categories[category] / total_reviews) * 100, 2) if total_reviews > 0 else 0
        
        return dict(categories)
    except Exception as e:
        print(f"Feedback categorization error: {str(e)}")
        return {
            "Feature Requests": 0,
            "Bugs": 0,
            "UX/UI": 0,
            "Performance": 0,
            "Others": 0
        }

def calculate_sentiment_trends(reviews, period="1y"):
    trends = defaultdict(lambda: {
        "Happy": 0,
        "Neutral": 0,
        "Frustrated": 0
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

def cluster_feedback(reviews):
    clusters = defaultdict(list)
    
    if not categorization_model:
        return clusters
    
    try:
        candidate_labels = ["Feature Requests", "Bugs", "UX/UI", "Performance", "Others"]
        
        for review in reviews:
            result = categorization_model(
                review["content"],
                candidate_labels,
                multi_class=True  # Ensure multi-class classification
            )
            max_score_index = result['scores'].index(max(result['scores']))
            category = result['labels'][max_score_index]
            
            clusters[category].append(review["content"])
    
    except Exception as e:
        print(f"Clustering error: {str(e)}")
    
    return clusters

def suggest_solutions(clusters):
    solutions = {}
    for category in clusters.keys():
        solutions[category] = {
            "Feature Requests": "Consider adding the requested feature.",
            "Bugs": "Investigate and fix the reported issue.",
            "UX/UI": "Redesign the interface for better usability.",
            "Performance": "Optimize app performance to reduce lag.",
            "Others": "Review feedback for further analysis."
        }.get(category, "No solution available.")
    return solutions

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        app_url = request.json.get('url', '')
        period = request.json.get('period', '1y')  # Add period parameter
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
                    "Happy": 0,
                    "Neutral": 0,
                    "Frustrated": 0
                },
                "categories": {
                    "Feature Requests": 0,
                    "Bugs": 0,
                    "UX/UI": 0,
                    "Performance": 0,
                    "Others": 0
                },
                "trends": {},
                "clusters": {},
                "solutions": {},
                "feedback": []
            }), 404

        # Calculate sentiment
        sentiment = analyze_sentiment(reviews)
        print("Sentiment Distribution:", sentiment)  # Log sentiment distribution
        
        # Categorize feedback
        categories = categorize_feedback(reviews)
        print("Feedback Categories:", categories)  # Log feedback categories
        
        # Calculate trends for the selected period
        trends = calculate_sentiment_trends(reviews, period)
        print("Sentiment Trends:", trends)  # Log sentiment trends
        
        # Cluster feedback and solutions
        clusters = cluster_feedback(reviews)
        solutions = suggest_solutions(clusters)
        
        # Prepare feedback items
        categorized_feedback = []
        if categorization_model:
            candidate_labels = ["Feature Requests", "Bugs", "UX/UI", "Performance", "Others"]
            
            for review in reviews[:10]:
                result = categorization_model(
                    review["content"],
                    candidate_labels,
                    multi_class=True
                )
                max_score_index = result['scores'].index(max(result['scores']))
                category = result['labels'][max_score_index]
                
                categorized_feedback.append({
                    "content": review["content"],
                    "category": category,
                    "solution": solutions.get(category, "N/A")
                })
        else:
            categorized_feedback = [
                {
                    "content": review["content"],
                    "category": "N/A",
                    "solution": "Model not found"
                }
                for review in reviews[:10]
            ]
        
        return jsonify({
            "sentiment": sentiment,
            "categories": categories,
            "trends": trends,
            "clusters": clusters,
            "solutions": solutions,
            "feedback": categorized_feedback
        })
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "sentiment": {
                "Happy": 0,
                "Neutral": 0,
                "Frustrated": 0
            },
            "categories": {
                "Feature Requests": 0,
                "Bugs": 0,
                "UX/UI": 0,
                "Performance": 0,
                "Others": 0
            },
            "trends": {},
            "clusters": {},
            "solutions": {},
            "feedback": []
        }), 500

if __name__ == '__main__':
    app.run(debug=True)