from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import joblib

# Optional: DirectML support for AMD GPU
try:
    import torch_directml
    device = torch_directml.device()
    HAS_GPU = True
except ImportError:
    device = torch.device("cpu")
    HAS_GPU = False

SVM_MODEL_PATH = "models/svm_model.joblib"

app = FastAPI(title="Health Predict AI API (SVM)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize variables to load later
svm_model = None
CLASS_NAMES = []
FEATURE_EXTRACTOR = None

@app.on_event("startup")
async def startup_event():
    global svm_model, CLASS_NAMES, FEATURE_EXTRACTOR
    
    # Load SVM Model and Classes
    if not os.path.exists(SVM_MODEL_PATH):
        print(f"Warning: Missing trained SVM model file at {SVM_MODEL_PATH}. Prediction will fail until model is trained.")
    else:
        svm_data = joblib.load(SVM_MODEL_PATH)
        svm_model = svm_data['model']
        CLASS_NAMES = svm_data['classes']

    # Setup Feature Extractor (same as training)
    resnet = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    FEATURE_EXTRACTOR = nn.Sequential(*list(resnet.children())[:-1]).to(device)
    FEATURE_EXTRACTOR.eval()

IMAGE_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

@app.post("/predict-image")
async def predict_image(file: UploadFile = File(...)):
    if svm_model is None:
        raise HTTPException(status_code=503, detail="SVM model not loaded. Please train the model first.")
        
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")

    image_tensor = IMAGE_TRANSFORM(img).unsqueeze(0).to(device)

    print(f"Processing image {file.filename} on {device}")

    # Extract features
    with torch.no_grad():
        features = FEATURE_EXTRACTOR(image_tensor).squeeze().cpu().numpy()
        if features.ndim == 1:
            features = np.expand_dims(features, axis=0)
            
    # SVM Prediction
    probabilities = svm_model.predict_proba(features)[0]
    pred_index = np.argmax(probabilities)
    confidence = probabilities[pred_index]

    top_predictions = [
        {
            "label": CLASS_NAMES[index],
            "confidence": float(probabilities[index])
        }
        for index in np.argsort(probabilities)[::-1][:3].tolist()
    ]

    return {
        "type": "image",
        "filename": file.filename,
        "prediction": CLASS_NAMES[pred_index],
        "confidence": float(confidence),
        "top_predictions": top_predictions,
        "model": "ResNet18 + SVM",
        "gpu_accelerated": HAS_GPU
    }

# Serve frontend static files
if not os.path.exists("static"):
    os.makedirs("static")

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
