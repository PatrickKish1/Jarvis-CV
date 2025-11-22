"use client";
import WebcamProcessor from "@/components/WebcamProcessor";
import NeuralScene from "@/components/NeuralScene";
import HandUI from "@/components/HandUI";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NeuralPage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden ">
      {/* 1. Background: Webcam Feed (Computer Vision) */}
      <WebcamProcessor />

      {/* 2. Neural Network Layer (Stateful) */}
      <NeuralScene />

      {/* 3. Hand Interactions Layer */}
      <HandUI />

      {/* 4. Navigation Back */}
      <div className="absolute top-6 left-6 z-50">
        <Link href="/">
          <button className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-full text-cyan-400 hover:bg-cyan-900/30 hover:text-cyan-200 transition-all group">
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="text-xs font-mono tracking-widest">
              RETURN TO HUD
            </span>
          </button>
        </Link>
      </div>

      {/* Overlay Title */}
      <div className="absolute top-6 right-6 z-50 text-right pointer-events-none">
        <h1 className="text-2xl font-bold text-white tracking-widest opacity-80 font-mono text-glow">
          NEURAL_INTERFACE
        </h1>
        <p className="text-cyan-400 text-xs mt-1 tracking-[0.3em] opacity-70">
          SYNAPTIC LINK ESTABLISHED
        </p>
      </div>
    </main>
  );
}
