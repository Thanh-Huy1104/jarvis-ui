import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { JarvisStatus } from '../hooks/useJarvis';
import Spinner from './Spinner';

function SpikyOrb({ analyser }: { analyser: AnalyserNode | null }) {
    const meshRef = useRef<THREE.Mesh>(null!);
    
    // Geometry
    const geometry = useMemo(() => {
        return new THREE.IcosahedronGeometry(1.5, 7); 
    }, []);

    const originalPositions = useRef<Float32Array | null>(null);
    const dataArray = useRef(new Uint8Array(512));
    const currentVolume = useRef(0);

    useEffect(() => {
        if (geometry) {
            originalPositions.current = geometry.attributes.position.array.slice() as Float32Array;
        }
    }, [geometry]);

    useFrame((state) => {
        if (!meshRef.current || !originalPositions.current) return;

        const time = state.clock.getElapsedTime();
        const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
        const original = originalPositions.current;

        // Audio Analysis
        let average = 0;
        if (analyser) {
            analyser.getByteFrequencyData(dataArray.current);
            const length = dataArray.current.length;
            let sum = 0;
            for(let i = 0; i < length; i++) {
                sum += dataArray.current[i];
            }
            average = sum / length;
        }

        const targetVolume = Math.max(0, (average / 255.0) - 0.04) * 1; 
        currentVolume.current = THREE.MathUtils.lerp(currentVolume.current, targetVolume, 0.4);
        const vol = currentVolume.current;

        // Animation
        for (let i = 0; i < positions.length; i += 3) {
            const x = original[i];
            const y = original[i+1];
            const z = original[i+2];

            const v = new THREE.Vector3(x, y, z).normalize();

            const peakX = Math.sin(v.x * 8.0 + time * 1.5);
            const peakY = Math.cos(v.y * 7.0 + time * 1.8);
            const peakZ = Math.sin(v.z * 8.0 + time * 1.6);
            
            const rawPeak = peakX * peakY * peakZ;
            const sharpPeak = Math.pow(Math.abs(rawPeak), 4.0);

            const displacement = 1.0 + (vol * 0.1) + (sharpPeak * (vol * 1.5));

            positions[i] = x * displacement;
            positions[i+1] = y * displacement;
            positions[i+2] = z * displacement;
        }

        meshRef.current.geometry.attributes.position.needsUpdate = true;
        meshRef.current.rotation.y += 0.002 + (vol * 0.002);
        meshRef.current.rotation.z += 0.001 + (vol * 0.001); 
    });

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <meshBasicMaterial 
                color="black" 
                wireframe={true} 
                transparent={true}
                opacity={0.4}
            />
        </mesh>
    );
}

interface SoundWaveProps {
    analyserNode: AnalyserNode | null;
    status: JarvisStatus;
}

export default function SoundWave({ analyserNode, status }: SoundWaveProps) {
    return (
        <div className="w-full h-full min-h-[300px] bg-white rounded-3xl overflow-hidden relative flex items-center justify-center">
            {status === 'processing' && <Spinner />}
            {status === 'listening' && (
                <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                    <color attach="background" args={['#ffffff']} />
                    <ambientLight intensity={0.5} />
                    <SpikyOrb analyser={analyserNode} />
                </Canvas>
            )}
        </div>
    );
}