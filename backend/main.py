import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from google_play_scraper import reviews, app as play_store_app
from transformers import pipeline, AutoConfig
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime, timedelta
from collections import defaultdict
import torch
import random
from urllib.parse import urlparse, parse_qs

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": "http://localhost:5173"}})

# Load VADER for sentiment analysis
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

# Predefined solutions based on categories
predefined_solutions = {
    "Feature Requests": [
        "Consider adding a dark mode feature.",
        "Add a settings menu to customize app behavior.",
        "Include a tutorial for new users."
    ],
    "Bugs": [
        "Investigate and fix the crash issue.",
        "Address the non-responsive behavior.",
        "Resolve the issue with the app opening."
    ],
    "UX/UI": [
        "Revise the user interface for better usability.",
        "Improve the visual design to enhance user experience.",
        "Simplify the navigation to make it more intuitive."
    ],
    "Navigation Issues": [
        "Improve the navigation flow to prevent confusion.",
        "Add a back button to facilitate easier navigation.",
        "Ensure consistent navigation across different screens."
    ],
    "Performance": [
        "Optimize the app to reduce lag and improve speed.",
        "Increase the app's performance by optimizing code.",
        "Reduce app loading times to improve user satisfaction."
    ],
    "Others": [
        "Review the feedback and take appropriate action.",
        "Investigate the feedback for potential improvements.",
        "Consider the feedback for future updates."
    ]
}

def extract_app_id(url):
    try:
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        if parsed_url.netloc != "play.google.com" or "id" not in query_params:
            print(f"Invalid URL: {url}")
            return None
        app_id = query_params["id"][0]
        print(f"Extracted App ID: {app_id}")
        return app_id
    except Exception as e:
        print(f"URL parsing error: {str(e)}")
        return None

def get_reviews(app_id):
    try:
        result, _ = reviews(
            app_id,
            lang="en",
            country="us",
            count=1000
        )
        return [
            {
                "content": review["content"],
                "date": review["at"].strftime("%Y-%m-%d") if "at" in review else "N/A"
            }
            for review in result
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
    
    # Sample if too many reviews to speed up
    if len(texts) > 50:
        import random
        # Use a fixed seed for reproducibility if needed, or just random
        sampled_indices = random.sample(range(len(texts)), 50)
        texts_to_process = [texts[i] for i in sampled_indices]
    else:
        texts_to_process = texts
        sampled_indices = range(len(texts))
    
    results = categorization_model(
        texts_to_process,
        candidate_labels,
        multi_label=False,
        batch_size=8 # Smaller batch size for CPU
    )
    
    categories = defaultdict(int)
    total_processed = len(texts_to_process)
    
    for i, idx in enumerate(sampled_indices):
        scores = results[i]['scores']
        labels = results[i]['labels']
        max_score_index = scores.index(max(scores))
        category = labels[max_score_index]
        
        # Post-processing logic to handle specific keywords
        content_lower = texts_to_process[i].lower()
        if "opened not able to go back" in content_lower or "force exit" in content_lower:
            category = "Bugs"
        elif "not working" in content_lower or "crash" in content_lower or "nonresponsive" in content_lower:
            category = "Bugs"
        elif "performance issue" in content_lower or "lag" in content_lower or "slow" in content_lower:
            category = "Performance"
        elif "ux" in content_lower or "ui" in content_lower or "interface" in content_lower:
            category = "UX/UI"
        elif "navigation" in content_lower or "go back" in content_lower or "exit" in content_lower:
            category = "Navigation Issues"
        
        categories[category] += 1
    
    for category in categories:
        categories[category] = round((categories[category] / total_processed) * 100, 2) if total_processed > 0 else 0
    
    return dict(categories)

def calculate_sentiment_trends(reviews, period="1y"):
    from collections import defaultdict, OrderedDict
    from datetime import datetime, timedelta
    import math
    
    trends = defaultdict(lambda: {
        "Delighted": 0,
        "Happy": 0,
        "Neutral": 0,
        "Frustrated": 0,
        "Angry": 0
    })
    
    cutoff = datetime.now()
    
    # Determine grouping strategy based on period
    if period == "1y":
        cutoff -= timedelta(days=365)
        group_by = "month"  # 12 bars (one per month)
    elif period == "6m":
        cutoff -= timedelta(days=180)
        group_by = "month"  # 6 bars (one per month)
    elif period == "3m":
        cutoff -= timedelta(days=90)
        group_by = "biweekly"  # 6 bars (2-week intervals)
    elif period == "1m":
        cutoff -= timedelta(days=30)
        group_by = "week"  # 4 bars (one per week)
    elif period == "1w":
        cutoff -= timedelta(days=7)
        group_by = "day"  # 7 bars (one per day)
    else:
        cutoff -= timedelta(days=365)
        group_by = "month"
    
    # Track dates for proper ordering
    date_mapping = {}
    
    for review in reviews:
        date_str = review["date"]
        if date_str == "N/A":
            continue
        
        try:
            review_date = datetime.strptime(date_str, "%Y-%m-%d")
        except:
            continue
            
        if review_date < cutoff:
            continue
        
        # Group based on strategy
        if group_by == "month":
            # Monthly grouping
            date_key = review_date.strftime("%b")
            sort_key = review_date.strftime("%Y-%m")
        elif group_by == "biweekly":
            # Bi-weekly grouping (2-week intervals)
            # Calculate which 2-week period this falls into
            days_since_cutoff = (review_date - cutoff).days
            period_num = min(days_since_cutoff // 14, 5)  # 0-5 for 6 periods
            week_start = cutoff + timedelta(days=period_num * 14)
            week_end = week_start + timedelta(days=13)
            date_key = f"{week_start.strftime('%d %b')}-{week_end.strftime('%d %b')}"
            sort_key = week_start.strftime("%Y-%m-%d")
        elif group_by == "week":
            # Weekly grouping (4 weeks in a month)
            days_since_cutoff = (review_date - cutoff).days
            week_num = min(days_since_cutoff // 7, 3)  # 0-3 for 4 weeks
            date_key = f"Week {week_num + 1}"
            sort_key = f"{week_num:02d}"
        elif group_by == "day":
            # Daily grouping (7 days)
            date_key = review_date.strftime("%a")  # Mon, Tue, Wed, etc.
            sort_key = review_date.strftime("%Y-%m-%d")
        else:
            date_key = review_date.strftime("%Y-%m-%d")
            sort_key = date_key
        
        # Store mapping for sorting
        if date_key not in date_mapping:
            date_mapping[date_key] = sort_key
        
        label = get_sentiment_label(review["content"])
        trends[date_key][label] += 1
    
    # Sort by actual date order
    sorted_trends = OrderedDict(
        sorted(trends.items(), key=lambda x: date_mapping.get(x[0], x[0]))
    )
    
    return dict(sorted_trends)

def get_random_solution(category):
    return random.choice(predefined_solutions.get(category, ["N/A"]))

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

        # Fetch app details
        app_details = play_store_app(
            app_id,
            lang='en',
            country='us'
        )
        app_name = app_details.get('title', 'Unknown App')
        playstore_category = app_details.get('genre', 'Unknown Category')

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
        
        # Prepare feedback samples with filtering
        categorized_feedback = []
        if categorization_model:
            filtered_reviews = [
                review for review in reviews 
                if get_sentiment_label(review["content"]) not in ["Delighted", "Happy"]
            ]
            feedback_samples = filtered_reviews[:10]
            
            texts_for_samples = [review["content"] for review in feedback_samples]
            sample_results = categorization_model(
                texts_for_samples,
                candidate_labels=[
                    "Feature Requests",
                    "Bugs",
                    "UX/UI",
                    "Navigation Issues",
                    "Performance",
                    "Others"
                ],
                multi_label=False,
                batch_size=10
            )
            
            for i, review in enumerate(feedback_samples):
                scores = sample_results[i]['scores']
                labels = sample_results[i]['labels']
                max_score_index = scores.index(max(scores))
                category = labels[max_score_index]
                
                # Post-processing logic to handle specific keywords
                content_lower = review["content"].lower()
                if "opened not able to go back" in content_lower or "force exit" in content_lower:
                    category = "Bugs"
                elif "not working" in content_lower or "crash" in content_lower or "nonresponsive" in content_lower:
                    category = "Bugs"
                elif "performance issue" in content_lower or "lag" in content_lower or "slow" in content_lower:
                    category = "Performance"
                elif "ux" in content_lower or "ui" in content_lower or "interface" in content_lower:
                    category = "UX/UI"
                elif "navigation" in content_lower or "go back" in content_lower or "exit" in content_lower:
                    category = "Navigation Issues"
                
                review_sentiment = get_sentiment_label(review["content"])
                
                # Get random predefined solution
                solution = get_random_solution(category)
                
                categorized_feedback.append({
                    "content": review["content"],
                    "category": category,
                    "sentiment": review_sentiment,
                    "solution": solution,
                    "count": 1
                })
        else:
            filtered_reviews = [
                review for review in reviews 
                if get_sentiment_label(review["content"]) not in ["Delighted", "Happy"]
            ]
            feedback_samples = filtered_reviews[:10]
            categorized_feedback = [
                {
                    "content": review["content"],
                    "category": "N/A",
                    "sentiment": get_sentiment_label(review["content"]),
                    "solution": "Model not found",
                    "count": 1
                }
                for review in feedback_samples
            ]
        
        return jsonify({
            "sentiment": sentiment,
            "categories": categories,
            "trends": trends,
            "feedback": categorized_feedback,
            "app_name": app_name,
            "category": playstore_category,
            "icon": app_details.get('icon', '')
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
    app.run(debug=True, port=5001)