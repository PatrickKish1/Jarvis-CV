# SAM 3D Backend Setup Guide

This guide will help you set up the SAM 3D backend service for converting images to 3D models.

## Quick Start

1. **Install Python Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set Up SAM 3D**
   ```bash
   cd ../support/sam-3d-objects
   # Follow the setup instructions in doc/setup.md
   conda env create -f environments/default.yml
   conda activate sam3d
   pip install -r requirements.txt
   ```

3. **Download Checkpoints**
   - Download SAM 3D model checkpoints
   - Place them in `support/sam-3d-objects/checkpoints/hf/`
   - Ensure `pipeline.yaml` exists in that directory

4. **Start Backend**
   ```bash
   cd backend
   python main.py
   # Or use the startup script:
   # Windows: start.bat
   # Linux/Mac: ./start.sh
   ```

5. **Verify Backend**
   ```bash
   curl http://localhost:8000/health
   ```

## Configuration

### Environment Variables

Create `backend/.env` (optional):
```env
PORT=8000
CUDA_HOME=/path/to/cuda
SAM3D_PATH=../support/sam-3d-objects
```

### Next.js Configuration

The Next.js API route will automatically connect to `http://localhost:8000`.

To change the backend URL, set environment variable:
```env
SAM3D_BACKEND_URL=http://your-backend-url:8000
```

## Troubleshooting

### Backend Not Starting
- Check Python version (3.10+)
- Verify SAM 3D is installed
- Check checkpoint path in `main.py`

### CUDA Errors
- Ensure CUDA is installed
- Check `CUDA_HOME` environment variable
- Verify GPU drivers are up to date

### Import Errors
- Activate the SAM 3D conda environment
- Check that `support/sam-3d-objects` path is correct
- Verify all dependencies are installed

### Model Generation Fails
- Check that checkpoints are downloaded
- Verify image format is supported
- Check backend logs for detailed errors

## API Usage

### Process Image
```bash
curl -X POST http://localhost:8000/api/sam3d/process \
  -F "image=@your-image.png" \
  -F "format=ply" \
  --output model.ply
```

### Health Check
```bash
curl http://localhost:8000/health
```

## Next Steps

Once the backend is running:
1. Upload an image through the web UI (Building Scene)
2. The image will be processed by SAM 3D
3. The 3D model will appear in the scene
4. Control it with hand gestures!

