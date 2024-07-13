import ollama
import time

'''
IDEAS:
- We will be given a set of data to learn and get out rag working.
- Will be a mass set of random data, we will also be given "targets" in the form of data
- These "targets" will be our queries into our RAG model

'''

class ResponseEngine:

    def __init__(self):
        self.system_prompt = '''
        You are a data extraction assistant.
        Your task is to analyze call transcripts and extract specific information related to the building type, number of floors, and number of people mentioned.
        Infer the building type from the given information to be the following (Office, Residential, Hotel, Museum).
        Use the following format for your responses:
        
        Building Type: (building type)
        Number of floors in building: (integer)
        Number of people in the building: (integer)
        
        Below is a sample call transcript for you to analyze and extract the required information:

        '''

    def read_call_transcript(self, file_path):
        try:
            with open(file_path, 'r') as file:
                transcript = file.read()
            return transcript, True
        except FileNotFoundError:
            return "Error", False

    def build_context(self,call_data):

        context = self.system_prompt + call_data

        return context

    def generate_response(self, prompt, call_file_path, response_model):
        transcript, flag = self.read_call_transcript(call_file_path)
        if not flag:
            print("File not found. Please check the file path and try again.")
            exit()
        
        context = self.build_context(transcript)
        print("CONTEXT:")
        print(context)
        response = ollama.chat(
            model = response_model,
            messages=[
                {
                    "role" : "system",
                    "content" : context
                },
                {
                    "role" : "user",
                    "content" : prompt
                },
            ],
            keep_alive="5m"
        )
        return response
        
re = ResponseEngine()
file_path = 'B_GIS/data/call_data/call_1.txt'
prompt = "Give me the information"

# data, flag = re.read_call_transcript(file_path)
# print(data)
# context = re.build_context(data)
# print(context)

response = re.generate_response(prompt,file_path,'phi3')
print(response['message']['content'])