import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, Float, Text } from '@react-three/drei';
import * as THREE from 'three';

// Colors
const colorOffline = new THREE.Color('#3A3A3A'); // Dark Charcoal Grey
const colorOnline = new THREE.Color('#34A853');  // Google Green
const emissiveOffline = new THREE.Color('#000000');
const emissiveOnline = new THREE.Color('#34A853');

function CentralCrystal({ isConnected }: { isConnected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null!);

  useFrame((state, delta) => {
    // 1. Slow, complex rotation for the crystal center
    meshRef.current.rotation.y += delta * 0.2;
    meshRef.current.rotation.z += delta * 0.1;

    // 2. Color Transition (Smooth Lerp)
    const targetColor = isConnected ? colorOnline : colorOffline;
    const targetEmissive = isConnected ? emissiveOnline : emissiveOffline;
    const lerpSpeed = delta * 2.5;

    materialRef.current.color.lerp(targetColor, lerpSpeed);
    materialRef.current.emissive.lerp(targetEmissive, lerpSpeed);
    // Increase material roughness slightly when offline for a duller look
    materialRef.current.roughness = THREE.MathUtils.lerp(materialRef.current.roughness, isConnected ? 0.1 : 0.4, lerpSpeed);
  });

  return (
    <mesh ref={meshRef} scale={[1.2, 1.2, 1.2]}>
      {/* Octahedron gives a nice diamond "crystal" look */}
      <octahedronGeometry args={[1, 0]} /> 
      <meshPhysicalMaterial 
        ref={materialRef}
        metalness={0.9}
        roughness={0.1} // Start shiny
        clearcoat={1}
        clearcoatRoughness={0.1}
        reflectivity={1}
        emissiveIntensity={isConnected ? 0.6 : 0}
      />
    </mesh>
  );
}

function OrbitingRings() {
  const ring1Ref = useRef<THREE.Group>(null!);
  const ring2Ref = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    // Rotate rings on different axes at different speeds
    ring1Ref.current.rotation.x += delta * 0.5;
    ring1Ref.current.rotation.y += delta * 0.2;
    
    ring2Ref.current.rotation.x -= delta * 0.3;
    ring2Ref.current.rotation.z += delta * 0.6;
  });

  const ringMaterial = new THREE.MeshStandardMaterial({
    color: '#555555',
    metalness: 0.8,
    roughness: 0.2,
    wireframe: false
  });

  return (
    <>
        {/* Ring 1 - Larger, slower */}
      <group ref={ring1Ref}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
            {/* Torus: radius, tube radius, radial segments, tubular segments */}
          <torusGeometry args={[1.8, 0.06, 16, 64]} />
          <primitive object={ringMaterial} attach="material" />
        </mesh>
      </group>

      {/* Ring 2 - Slightly smaller, faster, offset angle */}
      <group ref={ring2Ref} rotation={[0, Math.PI / 4, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.5, 0.06, 16, 64]} />
          <primitive object={ringMaterial} attach="material" />
        </mesh>
      </group>
    </>
  );
}

export default function GeometricCore({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.4} />
        {/* Main light source that will catch the edges */}
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        {/* Subtle back light for depth */}
        <pointLight position={[-5, -5, -10]} intensity={0.5} color="#aaddff" />
        
        <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <Center>
            <CentralCrystal isConnected={isConnected} />
            <OrbitingRings />
          </Center>
        </Float>

        {/* Optional: Simple particle effect in background for more depth */}
        <Stars radius={4} depth={2} count={100} factor={2} saturation={0} fade speed={0.5} />
      </Canvas>
    </div>
  );
}

// Simple background dust/stars helper from Drei
import { Stars } from '@react-three/drei';