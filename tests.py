import os
import json
# import chromadb
# from chromadb.utils import embedding_functions

def read_call_transcript(file_path):
    try:
        with open(file_path, 'r') as file:
            transcript = file.read()
        return transcript
    except FileNotFoundError:
        return "File not found. Please check the file path and try again."

# Define the path to the file
file_path = 'data/call_data/call_1.txt'

# Read the file content
call_transcript = read_call_transcript(file_path)

# Print the call transcript
print(call_transcript)
