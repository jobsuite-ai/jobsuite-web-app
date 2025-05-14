import csv
import requests
import json
import time
from urllib.parse import quote

# Input/output files
CSV_FILE = "/Users/jonaspeek/peek_painting/admin-web-app/public/scripts/redfin_recently.csv"
OUTPUT_FILE = "enriched_properties.csv"

# RentCast API
API_KEY = "aae5eee13ed042a88bd9e42e2879f4ef"
API_URL_BASE = "https://api.rentcast.io/v1/properties?address="

# Prepare list to store results
results = []

# Read from CSV
with open(CSV_FILE, mode="r", encoding="utf-8") as infile:
    reader = csv.DictReader(infile)

    for row in reader:
        # Build full address
        address = f"{row['ADDRESS']}, {row['CITY']}, {row['STATE OR PROVINCE']}, {row['ZIP OR POSTAL CODE']}"
        encoded_address = quote(address)

        url = f"{API_URL_BASE}{encoded_address}"
        headers = {
            "accept": "application/json",
            "X-Api-Key": API_KEY
        }

        # Request API
        response = requests.get(url, headers=headers)

        # 📦 Print full API response for inspection
        print(f"\n=== RentCast response for: {address} ===")
        data = response.json()[0]
        print(json.dumps(data, indent=2))  # <--- Print nicely formatted JSON

        if response.status_code == 200:
            try:
                data = response.json()[0]

                owner = data.get("owner", {}).get("names", ["Unknown"])[0]
                formatted_address = data.get("formattedAddress", address)
                sale_price = row.get("PRICE", "").strip() or "N/A"
                sold_date = row.get("SOLD DATE", "Unknown")

                results.append({
                    "Owner": owner,
                    "Address": formatted_address,
                    "Sale Price": sale_price,
                    "Sold Date": sold_date
                })
            except Exception as e:
                print(f"Error parsing response for {address}: {e}")
        else:
            print(f"Failed to fetch data for {address}: {response.status_code}")
        
        time.sleep(1)  # Rate limiting

# Write results to a new CSV
with open(OUTPUT_FILE, mode="w", newline="", encoding="utf-8") as outfile:
    writer = csv.DictWriter(outfile, fieldnames=["Owner", "Address", "Sale Price", "Sold Date"])
    writer.writeheader()
    writer.writerows(results)

print(f"\n✅ Data enrichment complete. Output saved to {OUTPUT_FILE}")
