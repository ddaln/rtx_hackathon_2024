import pandas as pd
import json

def process_pings():
    # Read the CSV file
    csv_file_path = 'C:/Users/alan1/Documents/Projects/rtx_hackathon_2024/B_GIS/data/map_data/Existing_Commercial_Wireless_Telecommunication_Services_Facilities_in_San_Francisco_20240712.csv'
    df = pd.read_csv(csv_file_path)

    # Read the JSON file
    json_file_path = 'C:/Users/alan1/Documents/Projects/rtx_hackathon_2024/B_GIS/data/call_data/tower_ping_logs.jsonl'
    with open(json_file_path, 'r') as f:
        data_dict = json.load(f)

    # Initialize an empty DataFrame to store the combined results
    combined_df = pd.DataFrame()

    # Iterate through each ping in the JSON data
    for id, ping in enumerate(data_dict):
        data = data_dict[id]
        carrier = data["Carrier"]
        orig_address = data["Address"] # TODO, FINISH GETTING FIRST NON NUMERIC WORD
        address = [item for item in orig_address.split(" ") if not any(char.isdigit() for char in item)][0]
        #print(address)
        type_of_building = data["Type of Building"]
        type_of_services = data["Type of Consumer Services"]
        num_antennas = data["Number of Antennas"]
        rf_range = data["Radio Frequency Range (Megahertz)"]

        # Filter the CSV based on the ping data
        if carrier == "AT&T":
            filtered_df = df[
            (df['Carrier'] == carrier) &
            #(df['Search Ring Name ID'].str.contains(address)) &
            (df['Type of Building'] == type_of_building) &
            (df['Type of Consumer Services'].str.contains(type_of_services)) &
            (df['Number of Antennas'].str.contains(str(num_antennas))) &
            (df['Radio Frequency Range (Megahertz)'].str.contains(rf_range))
            ]
        else:
            filtered_df = df[
            (df['Carrier'] == carrier) &
            (df['Type of Building'] == type_of_building) &
            (df['Type of Consumer Services'].str.contains(type_of_services)) &
            (df['Number of Antennas'].str.contains(str(num_antennas))) &
            (df['Radio Frequency Range (Megahertz)'].str.contains(rf_range))
            ]
        # Append the filtered data to the combined DataFrame
        combined_df = pd.concat([combined_df, filtered_df], ignore_index=True)

    # Remove duplicates from the combined DataFrame
    combined_df.drop_duplicates(inplace=True)

    selected_columns = [
        'Carrier',
        'Type of Building',
        'Type of Consumer Services',
        'Number of Antennas',
        'Radio Frequency Range (Megahertz)',
        'Latitude',
        'Longitude'
    ]

    call_location_df = combined_df[selected_columns]

    return call_location_df

def operator_input(building_type,min_num_floors,num_victims):
    pass

#operator_input(building_type="Office", min_num_floors=30, num_victims=12)

df = process_pings()
print(df)