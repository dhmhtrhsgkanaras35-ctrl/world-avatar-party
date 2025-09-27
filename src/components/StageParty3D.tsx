import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere } from '@react-three/drei';
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
      <Box args={[3, 0.2, 2]} position={[0, 0, 0]}>
        <meshPhongMaterial color="#2a2a2a" />
      </Box>
      
      {/* Backdrop */}
      <Box args={[3, 2, 0.1]} position={[0, 1, -1]}>
        <meshPhongMaterial color="#1a1a1a" />
      </Box>
      
      {/* Left Light Stand */}
      <Cylinder args={[0.05, 0.05, 2]} position={[-1.2, 1, -0.8]}>
        <meshPhongMaterial color="#333" />
      </Cylinder>
      
      {/* Right Light Stand */}
      <Cylinder args={[0.05, 0.05, 2]} position={[1.2, 1, -0.8]}>
        <meshPhongMaterial color="#333" />
      </Cylinder>
      
      {/* Left Light (Red) */}
      <Sphere ref={leftLightRef} args={[0.15]} position={[-1.2, 1.8, -0.8]}>
        <meshBasicMaterial color="#ff0040" />
      </Sphere>
      
      {/* Right Light (Blue) */}
      <Sphere ref={rightLightRef} args={[0.15]} position={[1.2, 1.8, -0.8]}>
        <meshBasicMaterial color="#0080ff" />
      </Sphere>
      
      {/* Left Speaker */}
      <Box ref={leftSpeakerRef} args={[0.4, 1, 0.3]} position={[-1.3, 0.5, 0.8]}>
        <meshPhongMaterial color="#222" />
      </Box>
      
      {/* Right Speaker */}
      <Box ref={rightSpeakerRef} args={[0.4, 1, 0.3]} position={[1.3, 0.5, 0.8]}>
        <meshPhongMaterial color="#222" />
      </Box>
      
      {/* Speaker Cones */}
      <Cylinder args={[0.12, 0.08, 0.05]} position={[-1.3, 0.7, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <meshPhongMaterial color="#444" />
      </Cylinder>
      <Cylinder args={[0.12, 0.08, 0.05]} position={[1.3, 0.7, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <meshPhongMaterial color="#444" />
      </Cylinder>
      
      {/* DJ Booth */}
      <Box args={[1, 0.8, 0.5]} position={[0, 0.5, 0.2]}>
        <meshPhongMaterial color="#333" />
      </Box>
      
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