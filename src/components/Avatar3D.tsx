import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DModelProps {
  url: string;
  animate?: boolean;
}

const Avatar3DModel = ({ url, animate = false }: Avatar3DModelProps) => {
  const { scene } = useGLTF(url);
  const meshRef = useRef<THREE.Group>(null);

  // Debug: Log model bounds
  console.log('Avatar3D Model loaded:', url);
  if (scene) {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    console.log('Model bounds:', { size, center });
  }

  useFrame((state) => {
    if (meshRef.current && animate) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <group ref={meshRef}>
      <primitive object={scene.clone()} scale={[1.2, 1.2, 1.2]} position={[0, -1.8, 0]} />
    </group>
  );
};

interface Avatar3DProps {
  avatarUrl?: string | null;
  width?: number;
  height?: number;
  animate?: boolean;
  showControls?: boolean;
  className?: string;
}

export const Avatar3D = ({ 
  avatarUrl, 
  width = 300, 
  height = 400, 
  animate = true,
  showControls = true,
  className = ""
}: Avatar3DProps) => {
  // Check if it's a valid .glb file
  const isValidGlb = avatarUrl && avatarUrl.endsWith('.glb');

  if (!isValidGlb) {
    return (
      <div 
        className={`bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center text-white font-bold ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">👤</div>
          <div className="text-sm">No 3D Avatar</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`} style={{ width, height }}>
      <Canvas
        camera={{ position: [0, 0.2, 4], fov: 50 }}
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: "high-performance",
          precision: "highp",
          preserveDrawingBuffer: true
        }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          
          <Avatar3DModel url={avatarUrl} animate={animate} />
          
          <Environment preset="sunset" />
          
          {showControls && (
            <OrbitControls 
              enablePan={false}
              enableZoom={true}
              maxDistance={4}
              minDistance={1}
              maxPolarAngle={Math.PI / 2}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};

// Preload function for better performance
export const preloadAvatar = (url: string) => {
  if (url.endsWith('.glb')) {
    useGLTF.preload(url);
  }
};