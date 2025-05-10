from flask_cors import CORS
from flask import Flask, request, jsonify
from google_play_scraper import reviews_all
from transformers import pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib
import os
from datetime import datetime, timedelta
from collections import defaultdict
from urllib.parse import urlparse, parse_qs

app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": "http://localhost:5173"}})

# Load Sentiment Analysis Model (5-level)
sentiment_analyzer = pipeline(
    "text-classification",
    model="cardiffnlp/twitter-roberta-base-sentiment",
    return_all_scores=True
)

# Load Feedback Categorization Model
try:
    categorization_model = joblib.load("categorization_model.pkl")
    vectorizer = joblib.load("vectorizer.pkl")
except FileNotFoundError:
    categorization_model = None
    vectorizer = None

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
            count=500  # Fetch more reviews for trends
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
        scores = sentiment_analyzer(review_content)[0]
        max_score = max(scores, key=lambda x: x['score'])
        label = max_score['label']
        
        # Adjust thresholds for better accuracy
        if label == 'positive':
            if max_score['score'] >= 0.7:  # Lower threshold for Delighted
                return 'Delighted'
            else:
                return 'Happy'
        elif label == 'negative':
            if max_score['score'] >= 0.7:  # Lower threshold for Angry
                return 'Angry'
            else:
                return 'Frustrated'
        else:
            return 'Neutral'
    except:
        return 'Neutral'

def analyze_sentiment(reviews):
    sentiment_counts = {
        "Delighted": 0,
        "Happy": 0,
        "Neutral": 0,
        "Frustrated": 0,
        "Angry": 0
    }
    
    for review in reviews:
        label = get_sentiment_label(review["content"])
        sentiment_counts[label] += 1
    
    return sentiment_counts

def categorize_feedback(reviews):
    if not categorization_model or not vectorizer:
        return {
            "Feature Requests": 0,
            "Bugs": 0,
            "UX/UI": 0,
            "Performance": 0,
            "Others": 0
        }
    
    try:
        X = vectorizer.transform([review["content"] for review in reviews])
        predictions = categorization_model.predict(X)
        
        categories = {
            "Feature Requests": 0,
            "Bugs": 0,
            "UX/UI": 0,
            "Performance": 0,
            "Others": 0
        }
        
        for pred in predictions:
            if pred in categories:
                categories[pred] += 1
            else:
                categories["Others"] += 1
        
        return categories
    except:
        return categories

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

def cluster_feedback(reviews):
    clusters = defaultdict(list)
    
    for review in reviews:
        if categorization_model and vectorizer:
            try:
                category = categorization_model.predict(
                    vectorizer.transform([review["content"]])
                )[0]
            except:
                category = "Others"
        else:
            category = "Others"
        clusters[category].append(review["content"])
    
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
        
        # Categorize feedback
        categories = categorize_feedback(reviews)
        
        # Calculate trends for the selected period
        trends = calculate_sentiment_trends(reviews, period)
        
        # Cluster feedback and solutions
        clusters = cluster_feedback(reviews)
        solutions = suggest_solutions(clusters)
        
        # Prepare feedback items
        categorized_feedback = []
        if categorization_model and vectorizer:
            X = vectorizer.transform([review["content"] for review in reviews])
            predictions = categorization_model.predict(X)
            
            for i in range(min(10, len(reviews))):
                categorized_feedback.append({
                    "content": reviews[i]["content"],
                    "category": predictions[i],
                    "solution": solutions.get(predictions[i], "N/A")
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
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(debug=True)