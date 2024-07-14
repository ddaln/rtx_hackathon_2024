# %%
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
from geodatasets import get_path
import numpy as np
import re
from math import radians, sin, cos, sqrt, atan2
from shapely.geometry import Point
from scipy.spatial import cKDTree
import folium
from tower_ping_search import process_pings

# %%
# Get df of tallest buildings in San Francisco
tallest_buildings_df = pd.read_csv('C:/Users/alan1/Documents/Projects/rtx_hackathon_2024/B_GIS/data/map_data/Tallest_Towers.csv')

# Get existing telecomm towers
sf_towers_old_df = pd.read_csv('C:/Users/alan1/Documents/Projects/rtx_hackathon_2024/B_GIS/data/map_data/Existing_Commercial_Wireless_Telecommunication_Services_Facilities_in_San_Francisco_20240712.csv')

# Get proposed telecomm towers
sf_towers_proposed_df = pd.read_csv('C:/Users/alan1/Documents/Projects/rtx_hackathon_2024/B_GIS/data/map_data/Proposed_Commercial_Wireless_Telecommunication_Services_Facilities_in_San_Francisco_20240712.csv')

# Get high-risk zones for liquefaction
sf_hazard_zones_df = gpd.read_file('C:/Users/alan1/Documents/Projects/rtx_hackathon_2024/B_GIS/data/map_data/San_Francisco_Seismic_Hazard_Zones_20240712.csv')
sf_hazard_zones_df["the_geom"] = gpd.GeoSeries.from_wkt(sf_hazard_zones_df["the_geom"])

# Get shore coordinates data
sf_shore_coords_df = gpd.read_file('C:/Users/alan1/Documents/Projects/rtx_hackathon_2024/B_GIS/data/map_data/SF_Shoreline_and_Islands_20240712.csv')
sf_shore_coords_df["the_geom"] = gpd.GeoSeries.from_wkt(sf_shore_coords_df["the_geom"])
sf_shore_coords_df.head()

# Shoreline geometry
shoreline_geometry = sf_shore_coords_df["the_geom"].iloc[0]
# Extract shoreline points
points = [coord for polygon in shoreline_geometry.geoms for coord in polygon.exterior.coords]
# Create GeoDataFrame for shoreline points
shoreline_gdf = gpd.GeoDataFrame(geometry=[Point(p) for p in points])
# Build a KD-tree from shoreline points
kdtree = cKDTree(shoreline_gdf.geometry.apply(lambda x: (x.x, x.y)).tolist())
# Find the nearest shoreline point for each building
tallest_buildings_df["Nearest_Shoreline_Index"] = tallest_buildings_df.apply(
    lambda row: kdtree.query([row["Longitude"], row["Latitude"]])[1],
    axis=1,
)
# Extract the nearest shoreline point coordinates
tallest_buildings_df["Nearest_Shoreline_Latitude"] = tallest_buildings_df.apply(
    lambda row: shoreline_gdf.geometry.iloc[row["Nearest_Shoreline_Index"]].y,
    axis=1,
)
tallest_buildings_df["Nearest_Shoreline_Longitude"] = tallest_buildings_df.apply(
    lambda row: shoreline_gdf.geometry.iloc[row["Nearest_Shoreline_Index"]].x,
    axis=1,
)

## Calculates distance to shoreline using Haversine formula (in miles)
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance_km = R * c
    distance_miles = distance_km * 0.621371  # Convert km to miles
    return distance_miles

tallest_buildings_df["Distance_to_Shore"] = tallest_buildings_df.apply(
    lambda row: haversine(
        row["Latitude"],
        row["Longitude"],
        row["Nearest_Shoreline_Latitude"],
        row["Nearest_Shoreline_Longitude"],
    ),
    axis=1,
)

# Get dataframe of towers that fit the criteria of the caller's pings
tower_ping_df = process_pings()
tower_ping_df.head()

## Finds the telecomm towers within a 0.5 mile radius of a given building
# Initialize an empty column for distances
tallest_buildings_df["Distance_to_Tower"] = None
tallest_buildings_df["Tower_Latitude"] = None
tallest_buildings_df["Tower_Longitude"] = None

# Set the maximum distance threshold (0.5 miles)
max_distance_miles = 0.5

# Iterate over each building
for index, building_row in tallest_buildings_df.iterrows():
    building_lat = building_row["Latitude"]
    building_lon = building_row["Longitude"]
    
    # Initialize lists to store distances and tower coordinates
    distances_to_towers = []
    tower_latitudes = []
    tower_longitudes = []
    
    # Calculate distances to each tower
    for tower_index, tower_row in tower_ping_df.iterrows():
        tower_lat = tower_row["Latitude"]
        tower_lon = tower_row["Longitude"]
        
        # Calculate distance
        distance = haversine(building_lat, building_lon, tower_lat, tower_lon)
        
        # Check if the distance is within the threshold
        if distance <= max_distance_miles:
            distances_to_towers.append(distance)
            tower_latitudes.append(tower_lat)
            tower_longitudes.append(tower_lon)
    
    # Store the lists of distances and tower coordinates in the DataFrame
    tallest_buildings_df.at[index, "Distance_to_Tower"] = distances_to_towers
    tallest_buildings_df.at[index, "Tower_Latitude"] = tower_latitudes
    tallest_buildings_df.at[index, "Tower_Longitude"] = tower_longitudes


# TODO Wanted to write functionality to check if the pings from the caller dataframe...
# ... align with any of the towers near the building to help us pinpoint the caller location

# large_given_lat = tower_ping_df["Latitude"].tolist()
# large_given_lon = tower_ping_df["Longitude"].tolist()
# coordinates = [[lat, lon] for lat, lon in zip(large_given_lat,large_given_lon)]

# new_coordinates = []

# for index,buildings in enumerate(tallest_buildings_df["Name"]):
#     near_building_towers_lat = tallest_buildings_df.at[index, "Tower_Latitude"]
#     near_building_towers_lon = tallest_buildings_df.at[index, "Tower_Longitude"]
#     for ind, lat_val in enumerate(near_building_towers_lat):
#         print(ind)
#         individual_tower_lat = near_building_towers_lat[ind]
#         individual_tower_lon = near_building_towers_lon[ind]
#         coord_query = [individual_tower_lat,individual_tower_lon]
#         if coord_query in coordinates:
#             new_coordinates.append(coord_query)


# %%
# Filter based on call transcript information
# TODO want to add an LLM on top of the transcript that processes the text and gives us discrete variables
building_type = 'Residential'
min_floors = 30
dist_to_shore = 0.5
# Check for positive result
checked_df = pd.DataFrame(tallest_buildings_df[(tallest_buildings_df['Use'].apply(lambda x: building_type in x if isinstance(x, str) else any(building_type in item for item in x))) 
                                               & (tallest_buildings_df['Floors'] >= min_floors)
                                               & (tallest_buildings_df['Distance_to_Shore'] <= dist_to_shore)])
# Check for negative result
# checked_df = pd.DataFrame(tallest_buildings_df[(tallest_buildings_df['Use'].apply(lambda x: building_type not in x if isinstance(x, str) else any(building_type not in item for item in x)))
#                                                & (tallest_buildings_df['Floors'] >= min_floors)])

# %%
# Initialize map around San Francisco
sf_map1 = folium.Map(location=[37.7750, -122.4200], zoom_start=12, max_zoom=16)

map_dark = folium.TileLayer(
    tiles='https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png',
    attr='CartoDB',
    name='CartoDB Light',
    overlay=False,
    control=True
)

# Display Buildings
for idx, row in tallest_buildings_df.iterrows():
    distance = round(row['Distance_to_Shore'], 3)
    icon_color = 'black'
    if distance < 0.3:
        icon_color = 'red'
    elif 0.3 <= distance < 0.5:
        icon_color = 'orange'
    else:
        icon_color = 'green'
    
    # Customize the popup content with HTML
    popup_content = f"<h4>{row['Name']} Building Info</h4>" \
                    f"<p><strong>Height:</strong> {row['Height ft(m)']} ft(m)</p>" \
                    f"<p><strong>Floors:</strong> {row['Floors']}</p>" \
                    f"<p><strong>Distance to Shore:</strong> {row['Distance_to_Shore']}</p>" \
                    f"<p><strong>Building Type:</strong> {row['Use']}</p>"

    # Create a popup with custom width
    popup = folium.Popup(popup_content, min_width=300, max_width=500)

    # Add a marker with the popup and tooltip to the map
    folium.Marker(
        location=[row['Latitude'], row['Longitude']],
        tooltip=f"{row['Name']} Click for more info...",
        popup=popup,
        icon=folium.Icon(color=icon_color, icon='building', prefix='fa')
    ).add_to(sf_map1)

#map_dark.add_to(sf_map1)
sf_map1.save('E_REPORTING/test_app/flask-folium-app-master/templates/sf_towers_map1.html')

# %%

# Display high-risk zones
for idx, row in sf_hazard_zones_df.iterrows():
    # Without simplifying the representation of each borough,
    # the map might not be displayed
    sim_geo = gpd.GeoSeries(row["the_geom"]).simplify(tolerance=0.001)
    geo_j = sim_geo.to_json()
    geo_j = folium.GeoJson(data=geo_j, style_function=lambda x: {"fillColor": "red"})
    folium.Popup(row["ID"]).add_to(geo_j)
    geo_j.add_to(sf_map1)

sf_map1.save('E_REPORTING/test_app/flask-folium-app-master/templates/sf_towers_map2.html')

# %%
sf_map3 = folium.Map(location=[37.7750, -122.4200], zoom_start=12, max_zoom=16)

from folium.plugins import HeatMap
# Create a heat map for ping datapoints

#m = folium.Map(location=[37.7749, -122.4194], zoom_start=12)

selected_columns = ['Latitude','Longitude']
call_location_df = sf_towers_old_df[selected_columns]
call_location_df = call_location_df.dropna()

# Add the heatmap layer
heatmap_layer = HeatMap(call_location_df).add_to(sf_map3)

# sf_map

# %%
# Display proposed cell towers
for idx, row in sf_towers_proposed_df.iterrows():
    if not np.isnan(row['LAT']) and not np.isnan(row['LONG']):

        # Customize the popup content with HTML
        popup_content = f"<p><strong>Carrier:</strong> {row['Carrier']}</p>" \
                        f"<p><strong>Address:</strong> {row['Address']}</p>" \
                        f"<p><strong>Type of Building:</strong> {row['Type of Building']}</p>" \
                        f"<p><strong>Services:</strong> {row['Type of Consumer Services']}</p>" \
                        f"<p><strong># Antennas:</strong> {row['Number of Antennas']}</p>" \
                        f"<p><strong>RF Range:</strong> {row['Radio Frequency Range (Megahertz)']}</p>" \

        # Create a popup with custom width
        popup = folium.Popup(popup_content, min_width=300, max_width=500)

        folium.Marker(
            location=[row['LAT'], row['LONG']],
            tooltip=f"{row['Carrier']} Click for more info...",
            popup=popup,
            icon=folium.Icon(color='red', icon='tower-cell', prefix='fa')
        ).add_to(sf_map3)

#map_dark.add_to(sf_map3)
sf_map3.save('E_REPORTING/test_app/flask-folium-app-master/templates/sf_towers_map3.html')
# %%
# Display cell towers
# Commented because it runs slow

# for idx, row in sf_towers_old_df.iterrows():
#     if not np.isnan(row['Latitude']) and not np.isnan(row['Longitude']):
#         folium.Marker(
#             location=[row['Latitude'], row['Longitude']],
#             tooltip=row['Carrier'],
#             popup=row['Carrier'],
#             icon=folium.Icon(color='green', icon='tower-cell', prefix='fa')
#         ).add_to(sf_map3)
# sf_map3.save('E_REPORTING/test_app/flask-folium-app-master/templates/sf_towers_map3.html')

