from google_play_scraper import reviews_all

app_id = "nremt.exam"

try:
    reviews = reviews_all(
        app_id,
        lang="en",
        country="us",
        count=10  # Fetch 10 reviews for simplicity
    )
    print(f"Reviews fetched: {len(reviews)}")
    print("First review content:", reviews[0]['content'])
except Exception as e:
    print(f"Error fetching reviews: {str(e)}")