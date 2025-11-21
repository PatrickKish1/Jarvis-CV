"""
SAM 3D Backend API Service
FastAPI service for processing images with SAM 3D and returning 3D models
"""

import os
import sys
import uuid
from pathlib import Path
from typing import Optional
import tempfile
import shutil

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

# Add SAM 3D to path
SAM3D_PATH = Path(__file__).parent.parent / "support" / "sam-3d-objects"
sys.path.insert(0, str(SAM3D_PATH))
sys.path.insert(0, str(SAM3D_PATH / "notebook"))

# Set environment variables for SAM 3D
os.environ.setdefault("CUDA_HOME", os.environ.get("CONDA_PREFIX", ""))
os.environ.setdefault("LIDRA_SKIP_INIT", "true")

try:
    from inference import Inference, load_image
    import numpy as np
    from PIL import Image
    SAM3D_AVAILABLE = True
except ImportError as e:
    print(f"Warning: SAM 3D not available: {e}")
    SAM3D_AVAILABLE = False

app = FastAPI(title="SAM 3D API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create output directory for models
OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# Global inference instance (lazy loaded)
inference_instance: Optional[Inference] = None


def get_inference():
    """Lazy load inference model"""
    global inference_instance
    if inference_instance is None:
        if not SAM3D_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="SAM 3D is not available. Please check installation."
            )
        
        # Check for checkpoints
        checkpoint_path = SAM3D_PATH / "checkpoints" / "hf" / "pipeline.yaml"
        if not checkpoint_path.exists():
            raise HTTPException(
                status_code=503,
                detail=f"SAM 3D checkpoints not found at {checkpoint_path}. Please download checkpoints."
            )
        
        print(f"Loading SAM 3D model from {checkpoint_path}...")
        inference_instance = Inference(str(checkpoint_path), compile=False)
        print("SAM 3D model loaded successfully!")
    
    return inference_instance


@app.get("/")
async def root():
    return {
        "message": "SAM 3D API Service",
        "status": "running",
        "sam3d_available": SAM3D_AVAILABLE,
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        if SAM3D_AVAILABLE:
            # Try to load model if not already loaded
            get_inference()
            return {"status": "healthy", "sam3d_loaded": True}
        else:
            return {"status": "degraded", "sam3d_available": False}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.post("/api/sam3d/process")
async def process_image(
    image: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None),
    seed: int = Form(42),
    format: str = Form("ply"),  # "ply" or "glb"
):
    """
    Process an image with SAM 3D to generate a 3D model
    
    Args:
        image: Image file (PNG, JPG, etc.)
        mask: Optional mask file (PNG with alpha channel or binary mask)
        seed: Random seed for reproducibility
        format: Output format ("ply" or "glb")
    
    Returns:
        3D model file (PLY or GLB)
    """
    if not SAM3D_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="SAM 3D is not available. Please install SAM 3D and checkpoints."
        )
    
    # Validate image format
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique ID for this request
    request_id = str(uuid.uuid4())
    
    try:
        # Save uploaded files temporarily
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Save image
            image_path = temp_path / f"image_{request_id}.png"
            with open(image_path, "wb") as f:
                shutil.copyfileobj(image.file, f)
            
            # Load and process image
            print(f"Loading image: {image_path}")
            pil_image = Image.open(image_path).convert("RGB")
            image_array = np.array(pil_image)
            
            # Process mask if provided
            mask_array = None
            if mask:
                mask_path = temp_path / f"mask_{request_id}.png"
                with open(mask_path, "wb") as f:
                    shutil.copyfileobj(mask.file, f)
                mask_image = Image.open(mask_path).convert("L")
                mask_array = np.array(mask_image) / 255.0
            
            # Run inference
            print(f"Running SAM 3D inference (seed={seed})...")
            inference = get_inference()
            output = inference(image_array, mask_array, seed=seed)
            
            # Save output model
            output_filename = f"model_{request_id}.{format}"
            output_path = OUTPUT_DIR / output_filename
            
            if format == "ply":
                # Save as PLY (Gaussian Splatting)
                if "gs" in output:
                    output["gs"].save_ply(str(output_path))
                    print(f"Saved PLY model to {output_path}")
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="Gaussian Splatting output not available"
                    )
            elif format == "glb":
                # Save as GLB (Mesh)
                if "mesh" in output:
                    # Export mesh as GLB
                    # Note: This requires additional mesh export logic
                    # For now, we'll use PLY and convert if needed
                    raise HTTPException(
                        status_code=501,
                        detail="GLB export not yet implemented. Use 'ply' format."
                    )
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="Mesh output not available"
                    )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported format: {format}. Use 'ply' or 'glb'"
                )
            
            # Return file
            return FileResponse(
                str(output_path),
                media_type="application/octet-stream",
                filename=output_filename,
                headers={
                    "X-Model-ID": request_id,
                    "X-Model-Format": format,
                }
            )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing image: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )


@app.get("/api/models/{model_id}")
async def get_model(model_id: str):
    """Retrieve a previously generated model"""
    model_path = OUTPUT_DIR / f"model_{model_id}.ply"
    if not model_path.exists():
        model_path = OUTPUT_DIR / f"model_{model_id}.glb"
    
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    
    return FileResponse(
        str(model_path),
        media_type="application/octet-stream",
        filename=model_path.name,
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )

