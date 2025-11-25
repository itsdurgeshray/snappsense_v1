import requests
import time
import json

URL = "http://localhost:5001/analyze"
PAYLOAD = {
    "url": "https://play.google.com/store/apps/details?id=com.whatsapp",
    "period": "1y"
}

def test_analyze():
    print("Sending request to /analyze...")
    start = time.time()
    try:
        response = requests.post(URL, json=PAYLOAD)
        duration = time.time() - start
        print(f"Request took {duration:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            print("Success!")
            print(f"App Name: {data.get('app_name')}")
            print(f"Category: {data.get('category')}")
            print(f"Icon: {data.get('icon')}")
            print(f"Categories: {data['categories']}")
        else:
            print(f"Failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Wait for server to start
    time.sleep(5) 
    test_analyze()
