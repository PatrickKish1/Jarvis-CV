import { NextRequest, NextResponse } from "next/server";

/**
 * SAM 3D API Endpoint
 * 
 * This endpoint receives an image file and forwards it to the Python backend
 * for processing with SAM 3D to convert it into a 3D model (PLY or GLB format).
 */

const BACKEND_URL = process.env.SAM3D_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const maskFile = formData.get("mask") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Create new FormData for backend
    const backendFormData = new FormData();
    backendFormData.append("image", imageFile);
    if (maskFile) {
      backendFormData.append("mask", maskFile);
    }
    backendFormData.append("seed", "42");
    backendFormData.append("format", "ply");

    try {
      // Forward request to Python backend
      const backendResponse = await fetch(`${BACKEND_URL}/api/sam3d/process`, {
        method: "POST",
        body: backendFormData,
      });

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error("Backend error:", errorText);
        
        // Check if backend is available
        if (backendResponse.status === 503) {
          return NextResponse.json(
            {
              error: "SAM 3D backend not available",
              message: "The Python backend service is not running or SAM 3D is not configured.",
              instructions: [
                "1. Start the backend: cd backend && python main.py",
                "2. Ensure SAM 3D is installed (see backend/README.md)",
                "3. Download model checkpoints to support/sam-3d-objects/checkpoints/hf/",
              ],
            },
            { status: 503 }
          );
        }

        return NextResponse.json(
          { error: "Backend processing failed", details: errorText },
          { status: backendResponse.status }
        );
      }

      // Get the model file from backend
      const modelBlob = await backendResponse.blob();
      const modelId = backendResponse.headers.get("X-Model-ID") || `model-${Date.now()}`;
      const modelFormat = backendResponse.headers.get("X-Model-Format") || "ply";

      // Save model to public directory or return URL
      // For now, we'll return a data URL or save to a temporary location
      // In production, you'd want to save to cloud storage or a persistent directory
      
      // Convert blob to base64 for data URL (temporary solution)
      const arrayBuffer = await modelBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:application/octet-stream;base64,${base64}`;

      // Return model URL
      return NextResponse.json({
        modelUrl: dataUrl,
        modelId: modelId,
        format: modelFormat,
        status: "completed",
      });

    } catch (fetchError) {
      console.error("Failed to connect to backend:", fetchError);
      return NextResponse.json(
        {
          error: "Backend connection failed",
          message: "Could not connect to SAM 3D backend service.",
          instructions: [
            "1. Ensure the backend is running: cd backend && python main.py",
            "2. Check that BACKEND_URL is correct (default: http://localhost:8000)",
            "3. Verify the backend health endpoint: curl http://localhost:8000/health",
          ],
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("SAM 3D conversion error:", error);
    return NextResponse.json(
      { error: "Failed to process image", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

