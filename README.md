---
title: Health Predict AI
emoji: 🏥
colorFrom: indigo
colorTo: pink
sdk: docker
pinned: false
---

# Health Predict AI 🏥

An advanced Support Vector Machine (SVM) diagnostic tool for classifying Breast Ultrasound Images (Benign, Malignant, Normal).

**Live Frontend (Vercel)**: *Add your Vercel URL here!*
**Live API (Hugging Face)**: https://sriramrenu-breast-cancer-prediction.hf.space

## Architecture
This project uses a Hybrid Transfer Learning approach to make Support Vector Machines perform exceptionally well on image data:
1. **ResNet18 Feature Extractor**: Converts raw pixels into a 512-dimensional numerical feature array.
2. **SVM Classifier**: An `sklearn.svm.SVC` model that performs the final classification on the extracted features, achieving an accuracy of **91.14%**.

## How to Use the Hosted API
You can interact with the cloud-hosted backend directly via REST API:

```python
import requests

# The live Hugging Face Space API URL
url = "https://sriramrenu-breast-cancer-prediction.hf.space/predict-image"

# Upload your ultrasound image
files = {"file": ("ultrasound.png", open("ultrasound.png", "rb"), "image/png")}
response = requests.post(url, files=files)

print(response.json())
```

### Example API Response:
```json
{
  "predicted_class": "malignant",
  "confidence": 0.84,
  "top_classes": [
    {"class": "malignant", "prob": 0.84},
    {"class": "benign", "prob": 0.12},
    {"class": "normal", "prob": 0.04}
  ]
}
```

## Local Development
To run this project locally:
1. `pip install -r requirements.txt`
2. `python app.py`
3. Open `http://localhost:8000` in your browser.
