import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DModelProps {
  url: string;
  animate?: boolean;
}

const Avatar3DModel = ({ url, animate = false }: Avatar3DModelProps) => {
  const { scene } = useGLTF(url);
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current && animate) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group ref={meshRef}>
      <primitive object={scene.clone()} scale={[0.9, 0.9, 0.9]} position={[0, -0.8, 0]} />
    </group>
  );
};

interface MapAvatar3DProps {
  avatarUrl?: string;
  displayName: string;
  isCurrentUser?: boolean;
  isFriend?: boolean;
  size?: 'small' | 'large';
}

export const MapAvatar3D = ({ 
  avatarUrl, 
  displayName, 
  isCurrentUser, 
  isFriend,
  size = 'large'
}: MapAvatar3DProps) => {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const containerSize = size === 'large' ? { width: 80, height: 100 } : { width: 64, height: 80 };
  
  const borderColor = isCurrentUser 
    ? 'border-blue-500 ring-2 ring-blue-200' 
    : isFriend 
    ? 'border-green-500 ring-2 ring-green-200' 
    : 'border-gray-400';

  const initials = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (avatarUrl) {
      // Extract avatar ID from ReadyPlayerMe PNG URL
      const matches = avatarUrl.match(/avatar\/([a-f0-9]{24})/);
      if (matches) {
        const avatarId = matches[1];
        const glbUrl = `https://models.readyplayer.me/${avatarId}.glb?pose=T&morphTargets=ARKit,Oculus%20Visemes`;
        setGlbUrl(glbUrl);
        setIsLoading(false);
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [avatarUrl]);

  // Fallback avatar
  const FallbackAvatar = () => (
    <div className={`w-12 h-12 rounded-full border-2 overflow-hidden bg-white shadow-xl flex items-center justify-center ${borderColor}`}>
      <div className="text-lg font-bold text-gray-700">{initials}</div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="relative">
        <div 
          className="flex items-center justify-center transition-transform hover:scale-110"
          style={{ width: containerSize.width, height: containerSize.height }}
        >
          <div className="animate-pulse">
            <FallbackAvatar />
          </div>
        </div>
      </div>
    );
  }

  // Error state or no GLB URL
  if (hasError || !glbUrl) {
    return (
      <div className="relative">
        <div 
          className="flex items-center justify-center transition-transform hover:scale-110"
          style={{ width: containerSize.width, height: containerSize.height }}
        >
          <FallbackAvatar />
        </div>
        {isCurrentUser && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
        )}
        {isFriend && !isCurrentUser && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
        )}
      </div>
    );
  }

  // 3D Avatar
  return (
    <div className="relative">
      <div 
        className="transition-transform hover:scale-110"
        style={{ width: containerSize.width, height: containerSize.height }}
      >
        <Canvas
          camera={{ position: [0, 1.2, 2.8], fov: 35 }}
          gl={{ 
            alpha: true, 
            antialias: true,
            powerPreference: "high-performance",
            precision: "highp"
          }}
          dpr={[1.5, 2.5]}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={1.2} />
            <directionalLight position={[2, 10, 2]} intensity={2.0} />
            <pointLight position={[-2, 5, -2]} intensity={1.0} />
            <pointLight position={[2, -2, 2]} intensity={0.6} />
            
            <Avatar3DModel url={glbUrl} animate={false} />
            
            <Environment preset="apartment" />
          </Suspense>
        </Canvas>
      </div>
      
      {/* Status indicators */}
      {isCurrentUser && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
      )}
      {isFriend && !isCurrentUser && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
      )}
    </div>
  );
};