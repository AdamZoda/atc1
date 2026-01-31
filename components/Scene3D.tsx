
import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Float, AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';

const Model = () => {
    // Load the 3D model
    const { scene } = useGLTF('/TOP.glb');
    const modelRef = useRef<THREE.Group>(null);

    // Rotation animation on its own Y axis
    useFrame((state, delta) => {
        if (modelRef.current) {
            modelRef.current.rotation.y += delta * 0.5; // Vitesse diminuée pour plus de fluidité
        }
    });

    return (
        <primitive
            ref={modelRef}
            object={scene}
            scale={4.2}
            position={[0, -0.5, 0]}
        />
    );
};

const Scene3D = () => {
    return (
        <div className="w-full h-full min-h-[400px] lg:min-h-[600px] relative z-10 cursor-move">
            <Canvas
                shadows={false} // Disable active shadows to gain performance
                dpr={[1, 1.5]} // Limit pixel ratio for high DPI screens
                camera={{ position: [0, 2, 8], fov: 45 }}
                className="w-full h-full"
                gl={{
                    alpha: true,
                    antialias: false, // Disable for better performance, use post-processing if needed
                    powerPreference: "high-performance",
                    preserveDrawingBuffer: false
                }}
                performance={{ min: 0.5 }} // Allow the scene to scale down on heavy load
            >
                <ambientLight intensity={0.7} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <Suspense fallback={null}>
                    <Float
                        speed={1.5}
                        rotationIntensity={0.1}
                        floatIntensity={0.3}
                        floatingRange={[-0.05, 0.05]}
                    >
                        <Model />
                    </Float>
                    <Environment preset="city" />
                    <ContactShadows
                        position={[0, -1.5, 0]}
                        opacity={0.3}
                        scale={8}
                        blur={3}
                        far={4}
                        frames={1} // Only render shadows once
                    />
                    <AdaptiveDpr pixelated />
                    <Preload all />
                </Suspense>

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    minPolarAngle={Math.PI / 2.5}
                    maxPolarAngle={Math.PI / 1.5}
                />
            </Canvas>
        </div>
    );
};

// Preload the model
useGLTF.preload('/TOP.glb');

export default Scene3D;
