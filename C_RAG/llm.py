import ollama


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

    def build_context(self,db_results):

        context = self.system_prompt + db_results

        return context

    def generate_response(self, prompt, query_results, response_model):
        context = self.build_context(query_results)
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