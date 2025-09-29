import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StageParty3DModelProps {
  animate?: boolean;
  scale?: number;
}

const StageParty3DModel = ({ animate = true, scale = 1 }: StageParty3DModelProps) => {
  const stageRef = useRef<THREE.Group>(null);
  const leftLightRef = useRef<THREE.Mesh>(null);
  const rightLightRef = useRef<THREE.Mesh>(null);
  const leftSpeakerRef = useRef<THREE.Mesh>(null);
  const rightSpeakerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!animate) return;

    const time = state.clock.elapsedTime;

    // Animate lights with pulsing colors
    if (leftLightRef.current && rightLightRef.current) {
      const redIntensity = Math.sin(time * 2) * 0.5 + 0.5;
      const blueIntensity = Math.cos(time * 2) * 0.5 + 0.5;
      
      (leftLightRef.current.material as THREE.MeshBasicMaterial).color.setRGB(redIntensity, 0, 0.3);
      (rightLightRef.current.material as THREE.MeshBasicMaterial).color.setRGB(0.3, 0, blueIntensity);
    }

    // Bounce speakers slightly
    if (leftSpeakerRef.current && rightSpeakerRef.current) {
      const bounce = Math.sin(time * 4) * 0.02;
      leftSpeakerRef.current.position.y = 0.5 + bounce;
      rightSpeakerRef.current.position.y = 0.5 + bounce;
    }

    // Rotate the entire stage slowly
    if (stageRef.current) {
      stageRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
    }
  });

  return (
    <group ref={stageRef} scale={[scale, scale, scale]}>
      {/* Stage Platform */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 0.2, 2]} />
        <meshPhongMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Backdrop */}
      <mesh position={[0, 1, -1]}>
        <boxGeometry args={[3, 2, 0.1]} />
        <meshPhongMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Left Light Stand */}
      <mesh position={[-1.2, 1, -0.8]}>
        <cylinderGeometry args={[0.05, 0.05, 2]} />
        <meshPhongMaterial color="#333" />
      </mesh>
      
      {/* Right Light Stand */}
      <mesh position={[1.2, 1, -0.8]}>
        <cylinderGeometry args={[0.05, 0.05, 2]} />
        <meshPhongMaterial color="#333" />
      </mesh>
      
      {/* Left Light (Red) */}
      <mesh ref={leftLightRef} position={[-1.2, 1.8, -0.8]}>
        <sphereGeometry args={[0.15]} />
        <meshBasicMaterial color="#ff0040" />
      </mesh>
      
      {/* Right Light (Blue) */}
      <mesh ref={rightLightRef} position={[1.2, 1.8, -0.8]}>
        <sphereGeometry args={[0.15]} />
        <meshBasicMaterial color="#0080ff" />
      </mesh>
      
      {/* Left Speaker */}
      <mesh ref={leftSpeakerRef} position={[-1.3, 0.5, 0.8]}>
        <boxGeometry args={[0.4, 1, 0.3]} />
        <meshPhongMaterial color="#222" />
      </mesh>
      
      {/* Right Speaker */}
      <mesh ref={rightSpeakerRef} position={[1.3, 0.5, 0.8]}>
        <boxGeometry args={[0.4, 1, 0.3]} />
        <meshPhongMaterial color="#222" />
      </mesh>
      
      {/* Speaker Cones */}
      <mesh position={[-1.3, 0.7, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 0.05]} />
        <meshPhongMaterial color="#444" />
      </mesh>
      <mesh position={[1.3, 0.7, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 0.05]} />
        <meshPhongMaterial color="#444" />
      </mesh>
      
      {/* DJ Booth */}
      <mesh position={[0, 0.5, 0.2]}>
        <boxGeometry args={[1, 0.8, 0.5]} />
        <meshPhongMaterial color="#333" />
      </mesh>
      
      {/* Light beams effect */}
      <pointLight position={[-1.2, 1.8, -0.8]} color="#ff0040" intensity={2} distance={5} />
      <pointLight position={[1.2, 1.8, -0.8]} color="#0080ff" intensity={2} distance={5} />
    </group>
  );
};

interface StageParty3DProps {
  width?: number;
  height?: number;
  animate?: boolean;
  showControls?: boolean;
  className?: string;
  scale?: number;
}

export const StageParty3D = ({ 
  width = 200, 
  height = 150, 
  animate = true,
  showControls = false,
  className = "",
  scale = 1
}: StageParty3DProps) => {
  return (
    <div className={`overflow-hidden rounded-lg ${className}`} style={{ width, height }}>
      <Canvas
        camera={{ position: [3, 2, 3], fov: 50 }}
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: "high-performance",
          precision: "highp"
        }}
        dpr={[1, 2]}
        style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffffff" />
        
        <StageParty3DModel animate={animate} scale={scale} />
      </Canvas>
    </div>
  );
};