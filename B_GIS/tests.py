import osmnx as ox
from geopy.distance import geodesic
import pandas as pd

# Define the area for San Francisco
place_name = "San Francisco, California, USA"

# Retrieve coastline data using OSMnx
coastline = ox.geometries_from_place(place_name, tags={'natural': 'coastline'})
print(coastline)
# Extract shoreline coordinates
shoreline_coords = []
for geom in coastline.geometry:
    if geom.geom_type == 'LineString':
        shoreline_coords.extend(list(geom.coords))
    elif geom.geom_type == 'MultiLineString':
        for line in geom:
            shoreline_coords.extend(list(line.coords))

# Function to calculate the minimum distance from a point to the shoreline
def min_distance_to_shoreline(building_coords, shoreline_coords):
    min_distance = float('inf')
    for shore_point in shoreline_coords:
        distance = geodesic(building_coords, shore_point).miles
        if distance < min_distance:
            min_distance = distance
    return min_distance

# Building data
buildings = [
    {"name": "Salesforce Tower", "coords": (37.7899, -122.3969)},
    {"name": "Transamerica Pyramid", "coords": (37.7952, -122.402)},
    {"name": "181 Fremont", "coords": (37.78970, -122.39535)},
    {"name": "555 California Street", "coords": (37.7919, -122.403)},
    {"name": "345 California Center", "coords": (37.7925, -122.4005)},
    {"name": "Millennium Tower", "coords": (37.7904, -122.3966)},
    {"name": "One Rincon Hill", "coords": (37.7869, -122.3921)},
    {"name": "The Avery", "coords": (37.7888, -122.3942)},
    {"name": "Park Tower at Transbay", "coords": (37.7902, -122.3942)},
    {"name": "Four Embarcadero Center", "coords": (37.7952, -122.3966)}
]

# Calculate distances
distances = []
for building in buildings:
    distance = min_distance_to_shoreline(building["coords"], shoreline_coords)
    distances.append({"name": building["name"], "distance_miles": distance})

# Convert to DataFrame for easy viewing
distances_df = pd.DataFrame(distances)

# Filter buildings within 1 mile from the shoreline
within_one_mile = distances_df[distances_df['distance_miles'] <= 1]

print("Buildings within 1 mile from the shoreline:")
print(within_one_mile)

# Optional: Save results to a CSV file
distances_df.to_csv('building_distances.csv', index=False)
