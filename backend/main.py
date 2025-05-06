from flask import Flask, request, jsonify
from google_play_scraper import reviews_all
from transformers import pipeline
from flask_cors import CORS
import joblib
import os

app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": "http://localhost:5173"}})  # Allow requests from Vite server

# Load Sentiment Analysis Model (5-level sentiment)
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
        from urllib.parse import urlparse, parse_qs
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
            count=10  # Fetch 10 reviews for simplicity
        )
        return [review["content"] for review in reviews]
    except Exception as e:
        print(f"Scraper error: {str(e)}")
        return []

def analyze_sentiment(reviews):
    results = []
    for review in reviews:
        scores = sentiment_analyzer(review)[0]
        max_score = max(scores, key=lambda x: x['score'])
        label = max_score['label']
        
        # Map to 5-level sentiment
        if label == 'positive':
            if max_score['score'] >= 0.8:
                mapped_label = 'Delighted'
            else:
                mapped_label = 'Happy'
        elif label == 'negative':
            if max_score['score'] >= 0.8:
                mapped_label = 'Angry'
            else:
                mapped_label = 'Frustrated'
        else:
            mapped_label = 'Neutral'
        
        results.append(mapped_label)
    
    sentiment_counts = {
        "Delighted": 0,
        "Happy": 0,
        "Neutral": 0,
        "Frustrated": 0,
        "Angry": 0
    }
    
    for label in results:
        sentiment_counts[label] += 1
    
    return sentiment_counts

def suggest_solution(category):
    solutions = {
        "Bugs": "Investigate and fix the reported issue.",
        "Feature Requests": "Consider adding the requested feature in future updates.",
        "UX/UI": "Redesign the interface for better usability.",
        "Performance": "Optimize app performance to reduce lag.",
        "Other": "Review feedback for further analysis."
    }
    return solutions.get(category, "No solution available.")

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    if request.method == 'OPTIONS':
        return jsonify({}), 204  # Handle preflight

    try:
        app_url = request.json.get('url', '')
        if not app_url:
            return jsonify({"error": "No URL provided"}), 400

        app_id = extract_app_id(app_url)
        if not app_id:
            return jsonify({"error": "Invalid URL"}), 400

        reviews = get_reviews(app_id)
        if not reviews:
            return jsonify({"error": "No reviews found"}), 404

        # Calculate 5-level sentiment
        sentiment = analyze_sentiment(reviews)
        
        # Categorize feedback (requires trained model)
        if categorization_model and vectorizer:
            X = vectorizer.transform(reviews)
            predictions = categorization_model.predict(X)
            
            categories = {
                "Feature Requests": 0,
                "Bugs": 0,
                "UX/UI": 0,
                "Performance": 0,
                "Other": 0
            }
            
            for pred in predictions:
                if pred in categories:
                    categories[pred] += 1
                else:
                    categories["Other"] += 1
            
            # Add category and solution to each feedback item
            categorized_feedback = []
            for i in range(len(reviews)):
                review_text = reviews[i]
                category = predictions[i]
                solution = suggest_solution(category)
                categorized_feedback.append({
                    "content": review_text,
                    "category": category,
                    "solution": solution
                })
        else:
            categories = {"Error": "Feedback categorization model not found."}
            categorized_feedback = [{"content": review, "category": "N/A", "solution": "N/A"} for review in reviews]
        
        return jsonify({
            "sentiment": sentiment,
            "feedback": categorized_feedback[:10],
            "categories": categories
        })
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(debug=True)