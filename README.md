---
title: Health Predict AI
emoji: 🏥
colorFrom: indigo
colorTo: pink
sdk: docker
pinned: false
---

# Health Predict AI 🏥

Image-only medical diagnosis demo using Kaggle-hosted breast histopathology data and a lightweight FastAPI image endpoint.

## What is kept
- `training/kaggle_train_images.py` for Kaggle-based image training
- `app.py` image upload and response endpoint
- `static/` frontend for image analysis

## Kaggle training
Run the image trainer inside a Kaggle notebook or script after attaching the dataset:

```bash
python training/kaggle_train_images.py
```

The script downloads the dataset through KaggleHub, trains the image model, and saves `model_image.pth`.

## API usage
```python
import requests

url = "http://localhost:8000/predict-image"
files = {"file": ("scan.png", open("scan.png", "rb"), "image/png")}
response = requests.post(url, files=files)
print(response.json())
```
