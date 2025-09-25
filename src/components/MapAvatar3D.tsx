import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';

interface MapAvatar3DModelProps {
  url: string;
  isCurrentUser: boolean;
}

const MapAvatar3DModel = ({ url, isCurrentUser }: MapAvatar3DModelProps) => {
  const { scene } = useGLTF(url);
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      // Gentle rotation
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={meshRef}>
      <primitive 
        object={scene.clone()} 
        scale={[0.8, 0.8, 0.8]} 
        position={[0, -0.5, 0]}
      />
      {/* Glow effect for current user */}
      {isCurrentUser && (
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.05, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
};

interface MapAvatar3DProps {
  avatarUrl?: string | null;
  name: string;
  isCurrentUser: boolean;
  size?: number;
}

export const MapAvatar3D = ({ 
  avatarUrl, 
  name, 
  isCurrentUser, 
  size = 80 
}: MapAvatar3DProps) => {
  const isValidGlb = avatarUrl && avatarUrl.endsWith('.glb');

  if (!isValidGlb) {
    return (
      <div 
        className="rounded-full flex items-center justify-center text-white font-bold shadow-lg animate-pulse"
        style={{ 
          width: size, 
          height: size,
          background: isCurrentUser ? '#3b82f6' : '#10b981',
          border: '3px solid white'
        }}
      >
        {isCurrentUser ? '📍' : name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg overflow-hidden shadow-xl border-2 border-white"
      style={{ 
        width: size, 
        height: size,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 2], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <pointLight position={[-5, -5, -5]} intensity={0.5} />
          
          <MapAvatar3DModel url={avatarUrl} isCurrentUser={isCurrentUser} />
          
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
    </div>
  );
};

// Function to create and mount 3D avatar marker
export const createMapAvatar3DMarker = (
  avatarUrl: string | null, 
  name: string, 
  isCurrentUser: boolean
): HTMLElement => {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 80px;
    height: 80px;
    cursor: pointer;
    position: relative;
  `;
  
  const root = createRoot(container);
  root.render(
    <MapAvatar3D 
      avatarUrl={avatarUrl}
      name={name}
      isCurrentUser={isCurrentUser}
      size={80}
    />
  );
  
  return container;
};