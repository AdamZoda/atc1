
import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Float, Center } from '@react-three/drei';
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
                shadows
                camera={{ position: [0, 2, 8], fov: 45 }}
                className="w-full h-full"
                gl={{ alpha: true, antialias: true }}
            >
                <ambientLight intensity={0.5} />
                <spotLight
                    position={[10, 10, 10]}
                    angle={0.15}
                    penumbra={1}
                    intensity={1}
                    castShadow
                />

                <Suspense fallback={null}>
                    <Float
                        speed={2}
                        rotationIntensity={0.2}
                        floatIntensity={0.5}
                        floatingRange={[-0.1, 0.1]}
                    >
                        <Model />
                    </Float>
                    <Environment preset="city" />
                    <ContactShadows
                        position={[0, -1.5, 0]}
                        opacity={0.4}
                        scale={10}
                        blur={2.5}
                        far={4}
                    />
                </Suspense>

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate={false} // Disabled orbit in favor of local rotation
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
