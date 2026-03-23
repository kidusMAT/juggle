import os
import django
import sys
from rest_framework.test import APIClient

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_buyer_market():
    print("--- Testing Buyer Market API ---")
    client = APIClient()
    try:
        r = client.get('/api/products/buyer_market/')
        print(f"Status Code: {r.status_code}")
        if r.status_code != 200:
            print("--- RESPONSE CONTENT ---")
            print(r.content.decode()[:2000]) # Print first 2k chars
            print("--- END CONTENT ---")
        else:
            print("Market API is 200 OK")
    except Exception as e:
        print(f"--- EXCEPTION: {str(e)} ---")

if __name__ == "__main__":
    test_buyer_market()
