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

  // Enhanced animations with breathing and subtle movement
  useFrame((state) => {
    if (meshRef.current) {
      if (animate) {
        // Gentle swaying motion
        meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        // Subtle breathing effect
        const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
        meshRef.current.scale.setScalar(breathe);
      }
      // Always add a very subtle floating animation
      meshRef.current.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }
  });

  return (
    <group ref={meshRef}>
      <primitive 
        object={scene.clone()} 
        scale={[1.0, 1.0, 1.0]} 
        position={[0, -0.5, 0]}
        castShadow
        receiveShadow
      />
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
  // Check if it's a valid Ready Player Me GLB or any .glb file
  const isValidGlb = avatarUrl && (avatarUrl.includes('readyplayer.me') || avatarUrl.endsWith('.glb'));

  console.log('Avatar3D render:', { avatarUrl, isValidGlb });

  if (!isValidGlb) {
    return (
      <div 
        className={`bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center text-white font-bold ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">👤</div>
          <div className="text-sm">No 3D Avatar</div>
          {avatarUrl && (
            <div className="text-xs mt-2 opacity-75">
              {avatarUrl.includes('.png') ? 'PNG format detected' : 'Unsupported format'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden transition-all duration-300 hover:scale-105 ${className}`} style={{ width, height }}>
      <Canvas
        camera={{ position: [0, 0.8, 4], fov: 60 }}
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: "high-performance",
          precision: "highp",
          preserveDrawingBuffer: true
        }}
        dpr={[2, 3]}
        style={{ background: 'transparent' }}
        shadows
      >
        <Suspense fallback={null}>
          {/* Enhanced lighting setup */}
          <ambientLight intensity={0.6} />
          <directionalLight 
            position={[10, 15, 10]} 
            intensity={1.5} 
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={1}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight position={[-10, 8, -10]} intensity={0.8} color="#ffeaa7" />
          <pointLight position={[10, -8, 10]} intensity={0.6} color="#74b9ff" />
          <spotLight
            position={[0, 15, 0]}
            angle={0.3}
            penumbra={1}
            intensity={1}
            castShadow
          />
          
          <Avatar3DModel url={avatarUrl} animate={animate} />
          
          <Environment preset="city" />
          
          {/* Add a subtle ground plane for shadows */}
          <mesh rotation-x={-Math.PI / 2} position={[0, -1.5, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial opacity={0.2} />
          </mesh>
          
          {showControls && (
            <OrbitControls 
              enablePan={false}
              enableZoom={true}
              maxDistance={6}
              minDistance={2}
              maxPolarAngle={Math.PI / 2}
              autoRotate={false}
              enableDamping={true}
              dampingFactor={0.05}
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