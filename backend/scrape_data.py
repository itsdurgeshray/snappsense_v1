from google_play_scraper import reviews_all
import pandas as pd

def scrape_reviews(app_id):
    try:
        reviews = reviews_all(
            app_id,
            lang="en",
            country="us",
            count=5000,  # Fetch more reviews
            sleep_milliseconds=0  # Adjust for rate limits
        )
        return [
            {
                "content": review["content"],
                "date": review["at"].strftime("%Y-%m-%d") if "at" in review else "N/A",
                "category": "N/A"  # Manually label this column
            }
            for review in reviews
        ]
    except Exception as e:
        print(f"Scraper error: {str(e)}")
        return []

# Example usage:
# reviews = scrape_reviews("com.spotify.music")
# df = pd.DataFrame(reviews)
# df.to_csv("spotify_reviews.csv", index=False)