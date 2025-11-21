"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Mesh, Group } from "three";
import { useStore } from "@/store/useStore";
import { Sphere, Torus, Ring, Icosahedron } from "@react-three/drei";
import BuildingScene from "./BuildingScene";

function useResponsivePositionAndScale() {
  const { size } = useThree();
  const { globePosition } = useStore();
  const isMobile = size.width < 768;
  
  // Use dynamic position from store, with base offset
  const baseX = isMobile ? 0 : -2;
  const baseY = isMobile ? -0.5 : 0;
  const baseZ = 0;
  
  const position = [
    baseX + globePosition.x,
    baseY + globePosition.y,
    baseZ + globePosition.z,
  ];
  const scale = isMobile ? 0.6 : 1; // Reduce scale to 60% on mobile
  return { position, scale };
}

// --- Scene 0: Arc Reactor ---
function ArcReactor({ active }: { active: boolean }) {
  const groupRef = useRef<Group>(null);
  const ring1Ref = useRef<Mesh>(null);
  const ring2Ref = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);

  const { position, scale: mobileScale } = useResponsivePositionAndScale();

  const { globeRotation, globeScale } = useStore();

  useFrame((state, delta) => {
    if (
      !groupRef.current ||
      !ring1Ref.current ||
      !ring2Ref.current ||
      !coreRef.current
    )
      return;

    // Smooth rotation with lerp for more natural movement
    const targetRotX = globeRotation.x * 0.5;
    const targetRotY = globeRotation.y * 0.5;
    
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.15;
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.15;

    // Animation
    ring1Ref.current.rotation.z += delta * 0.5;
    ring2Ref.current.rotation.x -= delta * 0.3;

    // Pulse
    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1;
    coreRef.current.scale.setScalar(pulse);

    // Scale & Transition
    // Apply mobile scale multiplier
    const targetScale = active ? globeScale * mobileScale : 0;
    groupRef.current.scale.lerp(
      { x: targetScale, y: targetScale, z: targetScale },
      0.1
    );
    groupRef.current.visible = groupRef.current.scale.x > 0.01;
  });

  return (
    // @ts-expect-error - position type mismatch in react-three/fiber types sometimes
    <group ref={groupRef} position={position}>
      <Sphere args={[0.4, 32, 32]} ref={coreRef}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </Sphere>
      <Sphere args={[0.6, 32, 32]}>
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.3}
          wireframe
        />
      </Sphere>
      <Torus ref={ring1Ref} args={[0.8, 0.05, 16, 100]}>
        <meshStandardMaterial
          color="#0088ff"
          emissive="#0044aa"
          emissiveIntensity={2}
          wireframe
        />
      </Torus>
      <Torus
        ref={ring2Ref}
        args={[1.1, 0.02, 16, 100]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={1}
        />
      </Torus>
      <Ring args={[1.3, 1.4, 64]}>
        <meshStandardMaterial
          color="#002244"
          side={2}
          transparent
          opacity={0.5}
        />
      </Ring>
    </group>
  );
}

// --- Scene 1: Holographic Earth ---
function EarthScene({ active }: { active: boolean }) {
  const groupRef = useRef<Group>(null);
  const { globeRotation, globeScale } = useStore();
  const { position, scale: mobileScale } = useResponsivePositionAndScale();

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Smooth rotation with lerp
    const targetRotX = globeRotation.x;
    const targetRotY = globeRotation.y + state.clock.elapsedTime * 0.05;
    
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.15;
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.15;

    const targetScale = active ? globeScale * mobileScale : 0;
    groupRef.current.scale.lerp(
      { x: targetScale, y: targetScale, z: targetScale },
      0.1
    );
    groupRef.current.visible = groupRef.current.scale.x > 0.01;
  });

  return (
    // @ts-expect-error - position type mismatch in react-three/fiber types sometimes
    <group ref={groupRef} position={position}>
      <Sphere args={[1.2, 32, 32]}>
        <meshBasicMaterial
          color="#00ff00"
          wireframe
          transparent
          opacity={0.2}
        />
      </Sphere>
      <Icosahedron args={[1.1, 2]}>
        <meshStandardMaterial
          color="#003300"
          transparent
          opacity={0.8}
          flatShading
        />
      </Icosahedron>
      {/* Satellites */}
      {[...Array(4)].map((_, i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 1.5) * 1.8, Math.cos(i * 1.5) * 1.8, 0]}
        >
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

// --- Scene 2: Solar System ---
function SolarSystem({ active }: { active: boolean }) {
  const groupRef = useRef<Group>(null);
  const { globeRotation, globeScale } = useStore();
  const { position, scale: mobileScale } = useResponsivePositionAndScale();

  useFrame(() => {
    if (!groupRef.current) return;
    
    // Smooth rotation with lerp
    const targetRotX = globeRotation.x * 0.5;
    const targetRotY = globeRotation.y * 0.5;
    
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.15;
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.15;

    const targetScale = active ? globeScale * mobileScale : 0;
    groupRef.current.scale.lerp(
      { x: targetScale, y: targetScale, z: targetScale },
      0.1
    );
    groupRef.current.visible = groupRef.current.scale.x > 0.01;
  });

  return (
    // @ts-expect-error - position type mismatch in react-three/fiber types sometimes
    <group ref={groupRef} position={position}>
      {/* Sun */}
      <Sphere args={[0.6, 32, 32]}>
        <meshBasicMaterial
          color="#ffcc00"
          transparent
          opacity={0.8}
          wireframe
        />
      </Sphere>
      {/* Orbit Rings */}
      {[1.2, 1.8, 2.4].map((rad, i) => (
        <Torus
          key={i}
          args={[rad, 0.02, 16, 64]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial color="#444444" transparent opacity={0.5} />
        </Torus>
      ))}
      {/* Planets (Simple) */}
      <mesh position={[1.2, 0, 0]}>
        <sphereGeometry args={[0.15]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>
      <mesh position={[-1.8, 0.2, 0.5]}>
        <sphereGeometry args={[0.2]} />
        <meshStandardMaterial color="#4444ff" />
      </mesh>
    </group>
  );
}

export default function GlobeScene() {
  const { activeScene } = useStore();

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} color="#00ffff" intensity={2} />

        <ArcReactor active={activeScene === 0} />
        <EarthScene active={activeScene === 1} />
        <SolarSystem active={activeScene === 2} />
      </Canvas>
      <BuildingScene />
    </div>
  );
}
