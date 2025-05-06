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
    ("Fix the bug", "Bugs"),
    ("Good design", "UX/UI"),
    ("Implement login", "Feature Requests"),
    ("Fast loading", "Performance"),
    ("Love the features", "Feature Requests"),  # Add more examples...
]

X, y = zip(*data)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

vectorizer = TfidfVectorizer()
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

model = MultinomialNB()
model.fit(X_train_tfidf, y_train)

print("Training Accuracy:", model.score(X_train_tfidf, y_train))
print("Testing Accuracy:", model.score(X_test_tfidf, y_test))
print("Classification Report:")
print(classification_report(y_test, model.predict(X_test_tfidf)))

# Save the model and vectorizer
joblib.dump(model, "categorization_model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")