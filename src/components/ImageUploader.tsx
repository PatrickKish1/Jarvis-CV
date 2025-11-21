"use client";

import { useState, useRef, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ImageUploader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { addImportedModel, activeScene } = useStore();

  // Only show in building scene
  if (activeScene !== 3) return null;

  const processFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file");
      setUploadStatus("error");
      return;
    }

    setIsUploading(true);
    setUploadStatus("uploading");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      // Call SAM 3D API
      const response = await fetch("/api/sam3d/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to process image" }));
        throw new Error(errorData.error || errorData.message || "Failed to process image");
      }

      const result = await response.json();

      // Check if backend is configured
      if (result.modelUrl) {
        // Backend is ready - add model to scene
        // Handle data URL or regular URL
        let modelUrl = result.modelUrl;
        
        // If it's a data URL, we need to handle it differently
        // For now, we'll create a blob URL from it
        if (modelUrl.startsWith("data:")) {
          // Convert data URL to blob URL
          const response = await fetch(modelUrl);
          const blob = await response.blob();
          modelUrl = URL.createObjectURL(blob);
        }
        
        addImportedModel({
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: modelUrl,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: 1,
        });
        setUploadStatus("success");
        setTimeout(() => {
          setIsOpen(false);
          setUploadStatus("idle");
        }, 2000);
      } else {
        // Backend not configured - show helpful message
        setUploadStatus("error");
        const instructions = result.instructions || [];
        setErrorMessage(
          result.message || "SAM 3D backend not configured. " +
          (instructions.length > 0 ? instructions.join(" ") : "Check backend/README.md for setup instructions.")
        );
        if (instructions.length > 0) {
          console.log("SAM 3D Setup Instructions:", instructions);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
      setUploadStatus("error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  return (
    <>
      {/* Upload Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full shadow-2xl transition-colors flex items-center gap-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Upload size={24} />
        <span className="hidden sm:inline">Upload Image</span>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-cyan-400">Upload Image for 3D Conversion</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Upload Area */}
                <div
                  ref={dropZoneRef}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isUploading
                      ? "border-cyan-500 bg-cyan-500/10 cursor-wait"
                      : isDragging
                      ? "border-cyan-400 bg-cyan-500/20 scale-105 cursor-grabbing"
                      : "border-gray-600 hover:border-cyan-500 hover:bg-gray-800/50 cursor-pointer"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />

                  {uploadStatus === "uploading" ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-cyan-400" size={32} />
                      <p className="text-gray-300">Processing with SAM 3D...</p>
                      <p className="text-xs text-gray-500">This may take a moment</p>
                    </div>
                  ) : uploadStatus === "success" ? (
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle2 className="text-green-400" size={32} />
                      <p className="text-green-400">Upload successful!</p>
                      <p className="text-xs text-gray-500">3D model added to scene</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className={`${isDragging ? "text-cyan-400 scale-110" : "text-gray-400"} transition-all`} size={32} />
                      <p className="text-gray-300">
                        {isDragging ? "Drop image here" : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG, WEBP up to 10MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-sm text-red-400">{errorMessage}</p>
                  </div>
                )}

                {/* Info */}
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-xs text-cyan-300">
                    💡 Upload an image to convert objects into 3D models using SAM 3D.
                    The converted model will appear in the building scene.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

