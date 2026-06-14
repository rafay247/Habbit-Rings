"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useHasWebGL } from "../lib/useHasWebGL";

function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 600;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 18;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02;
      pointsRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#3fb950"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Blob({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      ref.current.position.y = position[1] + Math.sin(t * 0.4 + position[0]) * 0.6;
      ref.current.rotation.x = t * 0.1;
      ref.current.rotation.z = t * 0.08;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <icosahedronGeometry args={[1.6, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        metalness={0.3}
        transparent
        opacity={0.18}
        wireframe
      />
    </mesh>
  );
}

export default function AmbientBackground() {
  const hasWebGL = useHasWebGL();
  if (!hasWebGL) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <FloatingParticles />
        <Blob position={[-5, 1, -2]} color="#3fb950" />
        <Blob position={[5.5, -1.5, -3]} color="#56d364" />
        <Blob position={[0, 2.5, -4]} color="#2ea043" />
      </Canvas>
    </div>
  );
}
