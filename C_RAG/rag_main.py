from RAG.llm import ResponseEngine
from RAG.database import ChromaSetup
from bcolors import bcolors as bc

def rag_main():
    # Initialize Response Engine
    re = ResponseEngine()
    # Initialze Database
    db_setup = ChromaSetup()

    cdb = db_setup.setup_chroma('test_db')

    # Recieve User Prompt
    prompt = input('What would you like to know? ->')

    results = cdb.query(
        query_texts = prompt,
        n_results = 5,
        include=['documents','distances','metadatas']
    )

    response = re.generate_response(results)

    print(bc.header("OLLAMA RESPONSE:"))
    print(response)