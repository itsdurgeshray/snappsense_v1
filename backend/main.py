from flask import Flask, request, jsonify
from google_play_scraper import reviews_all
from transformers import pipeline
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": "http://localhost:5173"}})  # Allow requests from Vite server

# Load Sentiment Analysis Model
sentiment_analyzer = pipeline("sentiment-analysis")

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

        sentiment_results = sentiment_analyzer(reviews)
        positive_count = sum(1 for result in sentiment_results if result['label'] == 'POSITIVE')
        negative_count = sum(1 for result in sentiment_results if result['label'] == 'NEGATIVE')
        neutral_count = len(reviews) - positive_count - negative_count

        categories = {
            "Feature Requests": 0,  # Placeholder
            "Bugs": 0,              # Placeholder
            "UX/UI": 0,             # Placeholder
            "Performance": 0        # Placeholder
        }

        return jsonify({
            "sentiment": {
                "positive": positive_count,
                "negative": negative_count,
                "neutral": neutral_count
            },
            "feedback": reviews[:10],
            "categories": categories
        })
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(debug=True)