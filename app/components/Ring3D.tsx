"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useHasWebGL } from "../lib/useHasWebGL";

interface RingMeshProps {
  value: number; // 0..100
  color: string;
}

function RingMesh({ value, color }: RingMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const fgRef = useRef<THREE.Mesh>(null);
  const [animated, setAnimated] = useState(0);

  const radius = 1;
  const tube = 0.18;

  const bgGeo = useMemo(
    () => new THREE.TorusGeometry(radius, tube, 16, 80, Math.PI * 2),
    []
  );

  useFrame((_, delta) => {
    // Ease the arc towards the target percentage.
    const target = Math.max(0, Math.min(100, value)) / 100;
    setAnimated((prev) => prev + (target - prev) * Math.min(1, delta * 4));
    if (groupRef.current) {
      // Gentle continuous tilt/spin for a living 3D feel.
      groupRef.current.rotation.y += delta * 0.5;
    }
    if (fgRef.current) {
      const arc = Math.max(0.0001, animated * Math.PI * 2);
      const geo = new THREE.TorusGeometry(radius, tube + 0.02, 18, 90, arc);
      fgRef.current.geometry.dispose();
      fgRef.current.geometry = geo;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.35, 0, Math.PI / 2]}>
      {/* Track */}
      <mesh geometry={bgGeo}>
        <meshStandardMaterial
          color="#2a342a"
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      {/* Progress arc */}
      <mesh ref={fgRef}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.55}
          roughness={0.25}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
}

export default function Ring3D({ value, color }: RingMeshProps) {
  const hasWebGL = useHasWebGL();
  if (!hasWebGL) {
    // Graceful fallback: a flat ring badge when WebGL is unavailable.
    const pct = Math.max(0, Math.min(100, value));
    return (
      <div
        style={{
          width: 60,
          height: 60,
          flex: "0 0 auto",
          borderRadius: "50%",
          background: `conic-gradient(${color} ${pct * 3.6}deg, #2a342a 0deg)`,
          WebkitMask: "radial-gradient(circle 18px at center, transparent 98%, #000 100%)",
          mask: "radial-gradient(circle 18px at center, transparent 98%, #000 100%)",
        }}
        aria-hidden
      />
    );
  }
  return (
    <div style={{ width: 60, height: 60, flex: "0 0 auto" }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} />
        <pointLight position={[-3, -2, 2]} intensity={0.6} color={color} />
        <RingMesh value={value} color={color} />
      </Canvas>
    </div>
  );
}
