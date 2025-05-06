import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# Sample labeled data (replace with real data)
data = [
    ("App crashes often", "Bugs"),
    ("Add dark mode", "Feature Requests"),
    ("Slow performance", "Performance"),
    ("UI is confusing", "UX/UI"),
    ("Love the features", "Positive"),  # This will be filtered out later
    ("Fix the bug", "Bugs"),
    ("Good design", "UX/UI"),
    ("Implement login", "Feature Requests"),
    ("Fast loading", "Positive"),  # This will be filtered out
]

# Filter out non-category entries (e.g., "Positive")
filtered_data = [item for item in data if item[1] not in ["Positive"]]

X, y = zip(*filtered_data)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

vectorizer = TfidfVectorizer()
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

categorization_model = MultinomialNB()
categorization_model.fit(X_train_tfidf, y_train)

# Evaluate the model (optional)
predictions = categorization_model.predict(X_test_tfidf)
print(classification_report(y_test, predictions))

# Save the model and vectorizer
joblib.dump(categorization_model, "categorization_model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")