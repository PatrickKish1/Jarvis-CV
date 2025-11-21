# J.A.R.V.I.S. HUD - Gemini 3 Pro Experiment

A next-generation Augmented Reality interface built with **Next.js 16**, **Three.js**, and **MediaPipe**. This project serves as a technical showcase and experiment powered by the coding capabilities of **Gemini 3 Pro**.

![Project Preview](./src/app/opengraph-image.png)

## 🧪 The Experiment

This entire codebase was architected and implemented with the assistance of **Gemini 3 Pro**. The goal was to push the boundaries of AI-assisted web development, creating a fully functional, immersive AR experience that runs entirely in the browser without heavy external dependencies.

## 🚀 Features

- **Advanced Gesture Control**: Control the interface naturally using your hands.
  - **Swipe (Open Palm)**: Switch between holographic modules (Arc Reactor, Global Net, Solar Array).
  - **Grab (Fist)**: Rotate 3D models in real-time.
  - **Pinch**: Scale holograms with precision.
- **Biometric Face HUD**: Real-time face tracking with a "Target Locked" tactical visor overlay.
- **Immersive 3D Holograms**: Three distinct interactive scenes rendered with React Three Fiber.
- **Dynamic Audio Synthesis**: Custom sound engine using the Web Audio API (no external assets).
- **Performance Optimized**: Built on Next.js 16 with Turbopack and Framer Motion springs for smooth 60fps performance.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js / React Three Fiber / Drei
- **Computer Vision**: MediaPipe (Hands & Face Mesh)
- **Animations**: Framer Motion
- **State Management**: Zustand

## 🎮 Controls

| Gesture                            | Action                           |
| :--------------------------------- | :------------------------------- |
| **Open Palm (Right Hand) + Swipe** | Switch active scene (Left/Right) |
| **Fist (Grab)**                    | Rotate the active hologram       |
| **Pinch (Two Hands)**              | Scale the hologram up or down    |
| **Face Camera**                    | Engage Target Lock HUD           |

### 📖 Detailed Gesture Guide

For a complete guide on how to perform each gesture and control the holograms, see **[HAND_GESTURE_CONTROLS.md](./HAND_GESTURE_CONTROLS.md)**

**Quick Reference:**
- **👌👌 Pinch (Both Hands)** → Move apart to zoom IN, together to zoom OUT
- **✊ Fist (One Hand)** → Move hand to rotate object
- **✋ Palm Open (One Hand)** → Swipe left/right to switch scenes

## 📦 Getting Started

1.  **Clone the repository**

    ```bash
    git clone https://github.com/suryanshchourasia/jarvis-hud.git
    cd jarvis-hud
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Run the development server**

    ```bash
    npm run dev
    ```

4.  **Open your browser**
    Navigate to `http://localhost:3000`. Allow camera access when prompted.

## ⚠️ Requirements

- A device with a webcam.
- A modern browser (Chrome/Edge/Safari/Firefox) with WebGL support.
- Good lighting for optimal hand/face tracking.

---

## 🔗 Connect

- **X (Twitter)**: [@suryanshchourasia](https://x.com/suryansh777777)
- **LinkedIn**: [Suryansh Chourasia](https://linkedin.com/in/suryansh777777)
- **GitHub**: [@suryanshchourasia](https://github.com/suryansh777777)

---

_Generated and refined with Gemini 3 Pro._
