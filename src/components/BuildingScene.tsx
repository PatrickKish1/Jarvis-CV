"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import { useStore } from "@/store/useStore";
import { OrbitControls, Grid, Environment, useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { Suspense } from "react";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

// 3D Model Loader Component
function ModelLoader({ url, position, rotation, scale }: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  let geometry: THREE.BufferGeometry | null = null;
  let gltf: any = null;
  
  // Load PLY files
  if (url.endsWith('.ply')) {
    geometry = useLoader(PLYLoader, url);
  } 
  // Load GLB/GLTF files
  else if (url.endsWith('.glb') || url.endsWith('.gltf')) {
    gltf = useGLTF(url);
  }

  // Render PLY geometry
  if (geometry) {
    // Compute normals for better lighting
    geometry.computeVertexNormals();
    return (
      <mesh position={position} rotation={rotation} scale={scale} geometry={geometry}>
        <meshStandardMaterial color="#00ffff" />
      </mesh>
    );
  }

  // Render GLTF model
  if (gltf) {
    return (
      <primitive
        object={gltf.scene}
        position={position}
        rotation={rotation}
        scale={scale}
      />
    );
  }

  return null;
}

// Building Scene Content
function BuildingSceneContent({ active }: { active: boolean }) {
  const groupRef = useRef<Group>(null);
  const { importedModels, globeRotation, globeScale } = useStore();

  useFrame(() => {
    if (!groupRef.current || !active) return;
    
    // Apply hand-controlled rotation to the entire scene
    groupRef.current.rotation.x += (globeRotation.x * 0.1 - groupRef.current.rotation.x) * 0.1;
    groupRef.current.rotation.y += (globeRotation.y * 0.1 - groupRef.current.rotation.y) * 0.1;
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
      />
      <Environment preset="city" />
      
      {/* Grid Floor */}
      <Grid
        infiniteGrid
        fadeDistance={50}
        sectionColor="#444"
        cellColor="#888"
        cellSize={1}
        cellThickness={0.5}
        sectionSize={5}
        sectionThickness={1}
      />

      {/* Floor Plane for Raycasting */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        userData={{ isFloor: true }}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Imported 3D Models */}
      <Suspense fallback={null}>
        {importedModels.map((model) => (
          <ModelLoader
            key={model.id}
            url={model.url}
            position={model.position}
            rotation={model.rotation}
            scale={model.scale * globeScale}
          />
        ))}
      </Suspense>
    </group>
  );
}

export default function BuildingScene() {
  const { activeScene } = useStore();
  const isActive = activeScene === 3;

  return (
    <div className={`absolute inset-0 z-10 ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <Canvas
        camera={{ position: [8, 8, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <BuildingSceneContent active={isActive} />
        {isActive && <OrbitControls makeDefault enablePan enableZoom enableRotate />}
      </Canvas>
    </div>
  );
}

