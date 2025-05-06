from google_play_scraper import reviews_all, Sort

app_id = "com.whatsapp"

try:
    reviews = reviews_all(
        app_id,
        sleep_milliseconds=0,  # Optional: delay between requests
        lang='en',             # Language
        country='us',          # Country
        sort=Sort.MOST_RELEVANT  # Sort by most relevant
    )
    print(f"Raw reviews data: {reviews}")  # Print raw data
    if 'reviews' in reviews and isinstance(reviews['reviews'], list):
        print(f"Reviews count: {len(reviews['reviews'])}")  # Print number of reviews
        for review in reviews['reviews'][:5]:
            print(review['content'])  # Print first 5 reviews
    else:
        print(f"Unexpected structure in reviews data: {reviews}")
except Exception as e:
    print(f"Error fetching reviews: {e}")