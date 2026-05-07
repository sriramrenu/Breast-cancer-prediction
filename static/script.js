// TODO: Replace with your Hugging Face Space URL after deployment (e.g., 'https://<username>-<spacename>.hf.space')
// Set to 'http://localhost:8000' for local testing
const API_BASE_URL = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('upload-area');
    const imageInput = document.getElementById('image-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const analyzeButton = document.getElementById('analyze-image-btn');
    const clearButton = document.getElementById('clear-image-btn');
    const resultContainer = document.getElementById('result-container');
    const resultCard = document.getElementById('result-card');
    const resultStatus = document.getElementById('result-status');
    const resultText = document.getElementById('result-text');
    const resultModel = document.getElementById('result-model');
    const confidenceFill = document.getElementById('confidence-fill');
    const confidenceText = document.getElementById('confidence-text');
    const gpuBadge = document.getElementById('gpu-badge');
    const topPredictions = document.getElementById('top-predictions');
    const modelBadge = document.getElementById('model-badge');
    const resultMessage = document.getElementById('result-message');

    let currentFile = null;

    const formatBytes = (bytes) => {
        if (!bytes) return '0 KB';
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / Math.pow(1024, index);
        return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
    };

    const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

    const setEmptyState = () => {
        resultContainer.classList.remove('hidden');
        resultCard.classList.add('hidden');
        resultContainer.classList.add('empty-state');
        resultMessage.classList.add('hidden');
        resultMessage.textContent = '';
        modelBadge.textContent = 'Waiting';
        modelBadge.className = 'status-chip';
    };

    const clearSelection = () => {
        currentFile = null;
        imageInput.value = '';
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        uploadArea.classList.remove('hidden');
        analyzeButton.disabled = true;
        setEmptyState();
    };

    const showPreview = (file) => {
        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatBytes(file.size);
        analyzeButton.disabled = false;

        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreviewContainer.classList.remove('hidden');
            uploadArea.classList.add('hidden');
        };
        reader.readAsDataURL(file);

        resultContainer.classList.remove('hidden');
        resultCard.classList.add('hidden');
        resultContainer.classList.add('empty-state');
        resultMessage.classList.add('hidden');
        resultMessage.textContent = '';
    };

    const renderTopPredictions = (items) => {
        topPredictions.innerHTML = '';

        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'top-prediction';
            row.innerHTML = `
                <div class="rank">${index + 1}</div>
                <div class="top-prediction-copy">
                    <strong>${capitalize(item.label)}</strong>
                    <span>${(item.confidence * 100).toFixed(2)}%</span>
                </div>
                <div class="mini-bar"><span style="width:${item.confidence * 100}%"></span></div>
            `;
            topPredictions.appendChild(row);
        });
    };

    const showResult = (data) => {
        resultContainer.classList.remove('empty-state');
        resultCard.classList.remove('hidden');
        resultContainer.classList.remove('hidden');
        resultMessage.classList.add('hidden');
        resultMessage.textContent = '';

        const label = capitalize(data.prediction);
        const confidence = Number(data.confidence || 0);
        const percent = (confidence * 100).toFixed(2);
        const isBenign = data.prediction === 'benign';

        resultText.textContent = label;
        resultModel.textContent = data.model || 'ResNet18 + SVM';
        confidenceText.textContent = `Confidence: ${percent}%`;
        confidenceFill.style.width = '0%';
        modelBadge.textContent = data.gpu_accelerated ? 'GPU Ready' : 'CPU Ready';
        modelBadge.className = `status-chip ${data.gpu_accelerated ? 'chip-gpu' : 'chip-cpu'}`;

        setTimeout(() => {
            confidenceFill.style.width = `${percent}%`;
        }, 50);

        resultStatus.className = `result-status ${isBenign ? 'status-benign' : 'status-malignant'}`;
        resultStatus.innerHTML = isBenign ? '✓' : '⚠';

        if (data.gpu_accelerated) {
            gpuBadge.classList.remove('hidden');
        } else {
            gpuBadge.classList.add('hidden');
        }

        if (Array.isArray(data.top_predictions)) {
            renderTopPredictions(data.top_predictions);
        } else {
            topPredictions.innerHTML = '';
        }

        resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    uploadArea.addEventListener('click', () => imageInput.click());

    uploadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadArea.classList.add('dragging');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });

    uploadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        uploadArea.classList.remove('dragging');
        const file = event.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const transfer = new DataTransfer();
            transfer.items.add(file);
            imageInput.files = transfer.files;
            showPreview(file);
        }
    });

    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            showPreview(file);
        }
    });

    clearButton.addEventListener('click', clearSelection);

    analyzeButton.addEventListener('click', async () => {
        if (!currentFile) {
            return;
        }

        analyzeButton.disabled = true;
        analyzeButton.textContent = 'Analyzing image...';

        const formData = new FormData();
        formData.append('file', currentFile);

        try {
            const response = await fetch(`${API_BASE_URL}/predict-image`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Prediction request failed');
            }

            const data = await response.json();
            showResult(data);
        } catch (error) {
            resultContainer.classList.remove('hidden');
            resultCard.classList.add('hidden');
            resultContainer.classList.add('empty-state');
            modelBadge.textContent = 'Error';
            modelBadge.className = 'status-chip chip-error';
            resultMessage.textContent = error.message || 'The backend could not process the uploaded image.';
            resultMessage.classList.remove('hidden');
        } finally {
            analyzeButton.disabled = false;
            analyzeButton.textContent = 'Analyze Image';
        }
    });

    setEmptyState();
});
