import { Environment, Gltf, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { degToRad } from "three/src/math/MathUtils";
import Avatar from "./Avatar";

export const Experience = ({ 
  isListening, 
  transcript, 
  currentAnimation, 
  visemeWeights, 
  isAvatarSpeaking 
}) => {
  
  // Debug log to see what viseme weights we're receiving
  console.log('Experience - Viseme weights:', visemeWeights, 'Type:', typeof visemeWeights);
  
  // Handle both single viseme format and multiple visemes format
  let avatarViseme = null;
  let avatarVisemes = null;
  
  if (visemeWeights) {
    // If it's a single viseme object with name and value
    if (visemeWeights.name && visemeWeights.value !== undefined) {
      avatarViseme = visemeWeights;
      console.log('Passing single viseme to Avatar:', avatarViseme);
    }
    // If it's an object with multiple morph target weights
    else if (typeof visemeWeights === 'object' && Object.keys(visemeWeights).length > 0) {
      avatarVisemes = visemeWeights;
      console.log('Passing multiple visemes to Avatar:', avatarVisemes);
    }
  }

  return (
    <>
      <Canvas camera={{ position: [5, 0, 7], fov: 39 }}>
        <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} />
        
        {/* Sunset lighting setup */}
        {/* Warm sunset ambient lighting */}
        <ambientLight intensity={0.4} color="#6322dcff" />
        
        {/* Sunset hemisphere light - warm sky, cool ground */}
        <hemisphereLight 
          skyColor="#7a33ffff" 
          groundColor="#4d5566" 
          intensity={0.6} 
        />
        
        {/* Main sunset key light - warm orange from the side */}
        <directionalLight 
          position={[6, 4, 4]} 
          intensity={1.2}
          color="#2e0da4ff"
          castShadow
          target-position={[2.9, -1.0, 3.9]}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Secondary sunset light - deeper orange */}
        <directionalLight 
          position={[1, 3, 6]} 
          intensity={0.8}
          color="#342e2cff"
          target-position={[2.9, -1.0, 3.9]}
        />
        
        {/* Soft purple fill light for sunset atmosphere */}
        <directionalLight 
          position={[2.9, 5, 1]} 
          intensity={0.3}
          color="#9966ff"
          target-position={[2.9, -1.0, 3.9]}
        />
        
        {/* Sunset avatar illumination */}
        <pointLight position={[2.9, 3, 5]} intensity={2.0} color="#ffaa66" />
        <pointLight position={[3.5, 2, 4.5]} intensity={1.5} color="#ff8844" />
        <pointLight position={[2.3, 2, 4.5]} intensity={1.5} color="#ffcc88" />
        
        {/* Warm sunset environment lights */}
        <pointLight position={[0, 4, 2]} intensity={1.0} color="#1f14e2ff" />
        <pointLight position={[6, 4, 2]} intensity={5.2} color="#ff7733" />
        <pointLight position={[3, 5, 0]} intensity={0.8} color="#cc6699" />
        
        {/* Sunset ceiling lights */}
        <pointLight position={[1, 6, 3]} intensity={1.0} color="#ffbb77" />
        <pointLight position={[4, 6, 3]} intensity={1.0} color="#ff9966" />
        <pointLight position={[2.5, 6, 5]} intensity={0.8} color="#ffaa55" />
        
        {/* Warm screen glow effects */}
        <pointLight position={[0.5, 1, 3.5]} intensity={0.6} color="#ff8844" />
        <pointLight position={[5, 1, 3.5]} intensity={0.6} color="#ffaa66" />
        
        {/* Room Model */}
        <Gltf src="/models/room.glb" position={[2.6, -1.0, 3.5]} />
       
        {/* Your Animated Avatar */}
        <Avatar
          position={[2.9, -1.0, 3.9]}
          scale={1.1}
          rotation={[0, degToRad(34), 0]}
          viseme={avatarViseme}    // Single viseme format
          visemes={avatarVisemes}  // Multiple visemes format
          isListening={isListening}
          isSpeaking={isAvatarSpeaking}
          currentAnimation={currentAnimation}
        />
      </Canvas>
    </>
  );
};