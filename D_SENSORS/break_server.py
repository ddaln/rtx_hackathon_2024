import requests
import json

def indicate_rescue(player_id, victim_id):
    url = "http://172.210.74.144:3000"  # Update the URL as necessary

    # Data to be sent in the POST request
    data = {
        "playerId": player_id,
        "victimId": victim_id,
        "status": "rescued"
    }

    # Send POST request
    try:
        response = requests.post(url, json=data)

        # Check if request was successful (status code 200)
        if response.status_code == 200:
            print("Rescue indication successful.")
        else:
            print(f"Failed to indicate rescue. Status code: {response.status_code}")
            print(response.text)  # Print response text for debugging
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")

# Example usage:
if __name__ == "__main__":
    player_id = "3"
    victim_id = "1"
    indicate_rescue(player_id, victim_id)
