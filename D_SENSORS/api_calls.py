import os
import json
import requests
import pandas as pd
import WalabotAPI
from bcolors import bcolors as bc

'''
IDEA:
- There will be one centralized Walabot that we can access via an api
- We need to be able to pull from this Walabot's api and actively upsert that info in our own db

Will need a way to assign the following to our recieved data:
- ["id", "text", "source", "metadata"]
'''

# Function to initialize the Walabot
def init_walabot():
    WalabotAPI.Init()
    WalabotAPI.Initialize()
    WalabotAPI.ConnectAny()

# Function to get raw Walabot data
def get_walabot_data():
    WalabotAPI.Start()
    WalabotAPI.StartCalibration()
    
    while not WalabotAPI.GetStatus()[0]:  # Wait for calibration to be complete
        WalabotAPI.Trigger()
    
    WalabotAPI.Trigger()
    targets = WalabotAPI.GetSensorTargets()
    
    WalabotAPI.Stop()
    WalabotAPI.Disconnect()
    WalabotAPI.Clean()

    return targets

# Function to parse Walabot data to DataFrame
def walabot_data_to_dataframe(targets):
    target_list = []

    for target in targets:
        target_dict = {
            'xPosCm': target.xPosCm,
            'yPosCm': target.yPosCm,
            'zPosCm': target.zPosCm,
            'amplitude': target.amplitude
        }
        target_list.append(target_dict)

    df = pd.DataFrame(target_list)
    return df

def main():
    init_walabot()
    walabot_data = get_walabot_data()
    walabot_df = walabot_data_to_dataframe(walabot_data)
    
    # Display the DataFrame
    print(walabot_df)

if __name__ == "__main__":
    main()

# class WalabotDataCache:
#     def __init__(self):
#         self.json_data = {} # dict to store temp/cached data
#         self.output_file = "walabot_data.jsonl"
    
#     def load_json_data(self,file_path):
#         try:
#             with open(file_path, "r", encoding="utf-8") as f:
#                 df = json.load(f)
#                 return df
#         except FileNotFoundError:
#             # Return empty dataframe if file does not exist
#             print(bc.warning(f"File ({file_path}) not found!"))
#             return pd.DataFrame()
    
#     def get_walabot_data(self):
#         walabot_link = "insert_link_here.com"
#         response = requests.get(walabot_link)
#         if response.status_code != 404:
#             response.raise_for_status()
#             json = response.json()
#             # TODO: Do not know json structure yet