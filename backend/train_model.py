import pandas as pd
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from sklearn.model_selection import train_test_split
import torch
import joblib

# Load preprocessed data
df = pd.read_csv("preprocessed_data.csv")  # Your preprocessed dataset

# Preprocess data
train_texts, val_texts, train_labels, val_labels = train_test_split(
    df["reviewText"].tolist(),
    df["category"].astype("category").cat.codes.tolist(),  # Convert labels to integers
    test_size=0.2,
    random_state=42
)

# Load label mapping for later use
label_map = joblib.load("label_map.pkl")

# Initialize tokenizer and model
model_name = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=len(label_map)
)

# Create PyTorch datasets
class FeedbackDataset(torch.utils.data.Dataset):
    def __init__(self, texts, labels):
        self.encodings = tokenizer(texts, truncation=True, padding=True)
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx])
        return item

    def __len__(self):
        return len(self.labels)

train_dataset = FeedbackDataset(train_texts, train_labels)
val_dataset = FeedbackDataset(val_texts, val_labels)

# Train the model
training_args = TrainingArguments(
    output_dir="feedback_model",
    evaluation_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=3,
    weight_decay=0.01,
    save_total_limit=2
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset
)

trainer.train()

# Save the trained model and tokenizer
model.save_pretrained("feedback_classification_model")
tokenizer.save_pretrained("feedback_classification_model")

print("Training completed. Model saved.")