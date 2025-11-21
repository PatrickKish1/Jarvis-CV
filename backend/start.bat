@echo off
REM Start SAM 3D Backend Service (Windows)

echo Starting SAM 3D Backend API...
echo Make sure SAM 3D is installed and checkpoints are downloaded
echo.

REM Activate conda environment if it exists
where conda >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Activating conda environment...
    call conda activate sam3d 2>nul || echo Conda environment 'sam3d' not found. Using system Python.
)

REM Run the backend
python main.py

