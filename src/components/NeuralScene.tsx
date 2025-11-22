"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { OrbitControls } from "@react-three/drei";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import { DynamicNetwork, Controls, THEMES } from "@/components/NeuralNetwork";

export default function NeuralScene() {
  const [density, setDensity] = useState(1.2);
  
  // Subscribe to store state here, so only this component re-renders
  const globeRotation = useStore((state) => state.globeRotation);
  const globeScale = useStore((state) => state.globeScale);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  return (
    <div className="absolute inset-0 z-10">
      {/* Background removed for clear AR view */}
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <OrbitControls
          autoRotate={false}
          enableZoom={true}
          maxDistance={25}
          minDistance={5}
        />

        <DynamicNetwork 
          themeKey={theme} 
          density={density} 
          active={true}
          rotation={globeRotation}
          scale={globeScale}
        />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.1}
            mipmapBlur
            intensity={1.5}
            radius={0.4}
          />
        </EffectComposer>
      </Canvas>
      <Controls
        theme={theme}
        setTheme={setTheme}
        density={density}
        setDensity={setDensity}
      />
    </div>
  );
}
