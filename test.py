from transformers import pipeline

classifier = pipeline("text-classification", model="addy88/sst5-sentence-t5-base", top_k=None)

print(classifier("The app crashes every time I open it. Unusable."))
# Output: [{'label': 'very negative', 'score': 0.81}, ...]
