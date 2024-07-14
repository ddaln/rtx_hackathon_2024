from unstructured.partition.pdf import partition_pdf
from bcolors import bcolors as bc
import chromadb
import ollama

def extract_text_from_pdf(file_path):
    documents = []
    ids = []
    elements = partition_pdf(filename=file_path, chunking_strategy='by_title', max_characters=2000, combine_text_under_n_chars=100)
    for element in elements:
        element = element.to_dict()
        documents.append(element['text'])
        ids.append(element['element_id'])
    
    return documents, ids

# TODO loop through all docs in the data folder, upsert to chromadb
pdf_path = "/data/5 things to know about earthquake search and rescue operations.pdf"
documents, ids = extract_text_from_pdf(pdf_path)

cc = chromadb.PersistentClient(path='/data/chroma')
collection = cc.get_or_create_collection(name='pdf_chunks')

collection.upsert(documents=documents,ids=ids)

prompt = input('How may I assist you? -> ')

results = collection.query(
            query_texts=prompt,
            n_results=5,
            include=['distances','documents'])

SYSTEM_PROMPT = '''You are an advanced AI assistant integrated into a Retrieval-Augmented Generation (RAG) framework.
        Your primary role is to support search and response operators by providing accurate, context-aware, and timely information. 
        You also act as a mission dispatcher, coordinating tasks and ensuring adherence to established rules of engagement (ROE).

        Answer only using the context provided, being as concise as possible.
        If you're unsure about a response, just say that you don't know.
        
        Context:
        '''
        
def build_context(result):
    context = SYSTEM_PROMPT
    for id, document in enumerate(result.get('ids')[0],start=1):
        document = result.get('documents')[0][id-1]
        
        # Append information to context
        context += document
    return context

response = ollama.chat(
        model='mistral:7b',
        messages=[{"role": "system","content": build_context(results),},{"role": "user", "content": prompt,},],keep_alive="10m")

print(f"{bc.OKGREEN}Question:\n {bc.ENDC} {prompt}\n")
print(f"{bc.OKGREEN}RAG Response:{bc.ENDC}\n{response['message']['content']}")