# SAM 3D Backend API

FastAPI backend service for processing images with SAM 3D and converting them to 3D models.

## Setup

### 1. Prerequisites

- Python 3.10+
- CUDA-capable GPU (recommended) or CPU
- SAM 3D checkpoints downloaded

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Install SAM 3D

Follow the setup instructions in `../support/sam-3d-objects/doc/setup.md`

Key steps:
```bash
cd ../support/sam-3d-objects
# Follow the conda environment setup
conda env create -f environments/default.yml
conda activate sam3d
pip install -r requirements.txt
```

### 4. Download Checkpoints

Download SAM 3D model checkpoints to `support/sam-3d-objects/checkpoints/hf/`

The checkpoint directory should contain:
- `pipeline.yaml` - Configuration file
- Model weights files

### 5. Run the Backend

```bash
cd backend
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

### Process Image
```
POST /api/sam3d/process
Content-Type: multipart/form-data

Parameters:
- image: Image file (required)
- mask: Mask file (optional)
- seed: Random seed (default: 42)
- format: Output format - "ply" or "glb" (default: "ply")
```

### Get Model
```
GET /api/models/{model_id}
```

## Environment Variables

- `PORT`: Server port (default: 8000)
- `CUDA_HOME`: CUDA installation path (auto-detected from conda)

## Output

Generated 3D models are saved to `backend/outputs/` directory.

## Troubleshooting

1. **SAM 3D not available**: Check that SAM 3D is installed and checkpoints are downloaded
2. **CUDA errors**: Ensure CUDA is properly installed and accessible
3. **Import errors**: Make sure SAM 3D path is correct in `main.py`

