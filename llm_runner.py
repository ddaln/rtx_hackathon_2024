import ollama

'''
IDEAS:
- We will be given a set of data to learn and get out rag working.
- Will be a mass set of random data, we will also be given "targets" in the form of data
- These "targets" will be our queries into our RAG model

'''

class ContextBuilder:

    def __init__(self):
        self.system_prompt = '''FILL IN SYSTEM PROMPT HERE'''

