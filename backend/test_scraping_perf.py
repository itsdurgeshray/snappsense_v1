import time
from google_play_scraper import reviews_all, reviews

APP_ID = 'com.whatsapp' # Popular app with many reviews

def test_reviews_all():
    start = time.time()
    try:
        # Fetch only a few to avoid waiting forever, but reviews_all doesn't support count limit well without fetching all pages
        # So we just check how long it takes to fail or if we can interrupt it. 
        # Actually, let's just test the proposed replacement 'reviews' to see how fast it is.
        print("Testing 'reviews' (new method)...")
        result, _ = reviews(
            APP_ID,
            lang='en',
            country='us',
            count=1000
        )
        print(f"Fetched {len(result)} reviews in {time.time() - start:.2f} seconds")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_reviews_all()
