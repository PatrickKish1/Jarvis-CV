#!/bin/bash
# Start SAM 3D Backend Service

echo "Starting SAM 3D Backend API..."
echo "Make sure SAM 3D is installed and checkpoints are downloaded"
echo ""

# Activate conda environment if it exists
if command -v conda &> /dev/null; then
    echo "Activating conda environment..."
    conda activate sam3d 2>/dev/null || echo "Conda environment 'sam3d' not found. Using system Python."
fi

# Run the backend
python main.py

