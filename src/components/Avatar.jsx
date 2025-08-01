import React, { useRef, useEffect, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import * as THREE from 'three';

function Avatar({ 
  viseme = null,
  visemes = null, // Handle both formats
  isListening = false, 
  isSpeaking = true, 
  currentAnimation = "idle",
  ...props 
}) {
  const { scene, nodes, materials } = useGLTF('/models/Avatar.glb');
  const { animations } = useGLTF('/models/Animations.glb');

  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group);
  const [activeAnimation, setActiveAnimation] = useState('idle');

  /** ✅ Safe Morph Target Setter (no warnings) */
  const setMorphTarget = (meshName, targetName, value) => {
    const mesh = nodes[meshName];
    if (
      mesh &&
      mesh.morphTargetDictionary &&
      mesh.morphTargetInfluences &&
      targetName in mesh.morphTargetDictionary
    ) {
      const index = mesh.morphTargetDictionary[targetName];
      mesh.morphTargetInfluences[index] = THREE.MathUtils.clamp(value, 0, 1);
    }
  };

  /** Get available morph targets (for Leva controls) */
  const getMorphTargets = () => {
    const morphTargets = {};
    ['EyeLeft', 'EyeRight', 'Wolf3D_Head', 'Wolf3D_Teeth'].forEach(meshName => {
      if (nodes[meshName] && nodes[meshName].morphTargetDictionary) {
        Object.keys(nodes[meshName].morphTargetDictionary).forEach(morphName => {
          morphTargets[morphName] = 0;
        });
      }
    });
    return morphTargets;
  };

  // Debug: Log available morph targets (optional)
  useEffect(() => {
    ['Wolf3D_Head', 'Wolf3D_Teeth'].forEach(meshName => {
      if (nodes[meshName]?.morphTargetDictionary) {
        console.log(`Available morph targets on ${meshName}:`, 
          Object.keys(nodes[meshName].morphTargetDictionary)
        );
      }
    });
  }, [nodes]);

  /** Leva controls */
  const { animation } = useControls('🎬 Animations', {
    animation: {
      value: currentAnimation || 'idle',
      options: ['idle', 'stand', 'talking'],
    },
  });

  const { expression } = useControls('😊 Expressions', {
    expression: {
      value: 'neutral',
      options: ['neutral', 'smile', 'sad', 'surprised', 'angry'],
    },
  });

  const morphTargets = getMorphTargets();

  const morphControls = useControls('🎭 Morph Targets',
    Object.keys(morphTargets).length > 0 
      ? Object.fromEntries(
          Object.keys(morphTargets).slice(0, 15).map(morphName => [
            morphName,
            {
              value: 0,
              min: 0,
              max: 1,
              step: 0.01,
            },
          ])
        )
      : { note: { value: 'Loading morph targets...', editable: true } }
  );

  /** Handle animation changes based on app state */
  useEffect(() => {
    let targetAnimation = 'idle';
    
    if (isSpeaking) {
      targetAnimation = 'talking';
    } else if (isListening) {
      targetAnimation = 'idle';
    } else {
      targetAnimation = currentAnimation || 'idle';
    }

    if (actions && targetAnimation && actions[targetAnimation] && targetAnimation !== activeAnimation) {
      if (activeAnimation && actions[activeAnimation]) {
        actions[activeAnimation].fadeOut(0.5);
      }
      actions[targetAnimation].reset().fadeIn(0.4).play();
      setActiveAnimation(targetAnimation);
    }
  }, [isSpeaking, isListening, currentAnimation, actions, activeAnimation]);

  /** Leva manual animation control */
  useEffect(() => {
    if (actions && animation && actions[animation] && !isSpeaking && !isListening) {
      if (activeAnimation && actions[activeAnimation]) {
        actions[activeAnimation].fadeOut(0.5);
      }
      actions[animation].reset().fadeIn(0.5).play();
      setActiveAnimation(animation);
    }
  }, [animation, actions, activeAnimation, isSpeaking, isListening]);

  /** Initialize with idle animation */
  useEffect(() => {
    if (actions && actions.idle) {
      actions.idle.play();
      setActiveAnimation('idle');
    }
  }, [actions]);

  /** Apply morph targets from Leva sliders */
  useEffect(() => {
    Object.entries(morphControls).forEach(([morphName, value]) => {
      ['EyeLeft', 'EyeRight', 'Wolf3D_Head', 'Wolf3D_Teeth'].forEach(meshName => {
        setMorphTarget(meshName, morphName, value);
      });
    });
  }, [morphControls]);

  /** Apply expressions */
  useEffect(() => {
    // Reset all morph targets first
    Object.keys(morphTargets).forEach(morphName => {
      ['EyeLeft', 'EyeRight', 'Wolf3D_Head', 'Wolf3D_Teeth'].forEach(meshName => {
        setMorphTarget(meshName, morphName, 0);
      });
    });

    // Apply expression
    switch (expression) {
      case 'smile':
        setMorphTarget('Wolf3D_Head', 'mouthSmileLeft', 0.7);
        setMorphTarget('Wolf3D_Head', 'mouthSmileRight', 0.7);
        setMorphTarget('EyeLeft', 'eyeSquintLeft', 0.3);
        setMorphTarget('EyeRight', 'eyeSquintRight', 0.3);
        break;
      case 'sad':
        setMorphTarget('Wolf3D_Head', 'mouthFrownLeft', 0.8);
        setMorphTarget('Wolf3D_Head', 'mouthFrownRight', 0.8);
        setMorphTarget('Wolf3D_Head', 'browInnerUp', 0.5);
        break;
      case 'surprised':
        setMorphTarget('EyeLeft', 'eyeWideLeft', 0.8);
        setMorphTarget('EyeRight', 'eyeWideRight', 0.8);
        setMorphTarget('Wolf3D_Head', 'jawOpen', 0.4);
        setMorphTarget('Wolf3D_Head', 'browInnerUp', 0.7);
        break;
      case 'angry':
        setMorphTarget('Wolf3D_Head', 'browDownLeft', 0.8);
        setMorphTarget('Wolf3D_Head', 'browDownRight', 0.8);
        setMorphTarget('EyeLeft', 'eyeSquintLeft', 0.8);
        setMorphTarget('EyeRight', 'eyeSquintRight', 0.8);
        break;
      default:
        break;
    }
  }, [expression, morphTargets]);

  /** ✅ Handle visemes (lip sync) */
  useEffect(() => {
    const mouthMorphs = [
      'mouthOpen', 'jawOpen', 'mouthSmileLeft', 'mouthSmileRight', 
      'mouthFrownLeft', 'mouthFrownRight', 'mouthPucker', 'mouthLeft', 'mouthRight'
    ];

    // Reset when not speaking
    if (!isSpeaking && !viseme && !visemes) {
      mouthMorphs.forEach(morphName => {
        ['Wolf3D_Head', 'Wolf3D_Teeth'].forEach(meshName => {
          setMorphTarget(meshName, morphName, 0);
        });
      });
      return;
    }

    // Single viseme
    if (viseme && viseme.name && viseme.value !== undefined) {
      mouthMorphs.forEach(morphName => {
        ['Wolf3D_Head', 'Wolf3D_Teeth'].forEach(meshName => {
          setMorphTarget(meshName, morphName, 0);
        });
      });
      ['Wolf3D_Head', 'Wolf3D_Teeth'].forEach(meshName => {
        setMorphTarget(meshName, viseme.name, viseme.value);
      });
    }

    // Multiple visemes
    else if (visemes && typeof visemes === 'object') {
      mouthMorphs.forEach(morphName => {
        ['Wolf3D_Head', 'Wolf3D_Teeth'].forEach(meshName => {
          setMorphTarget(meshName, morphName, 0);
        });
      });
      Object.entries(visemes).forEach(([morphName, value]) => {
        if (value > 0) {
          ['Wolf3D_Head', 'Wolf3D_Teeth'].forEach(meshName => {
            setMorphTarget(meshName, morphName, value);
          });
        }
      });
    }
  }, [viseme, visemes, isSpeaking]);

  /** Update mixer per frame */
  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
    </group>
  );
}

useGLTF.preload('/models/Avatar.glb');
useGLTF.preload('/models/Animations.glb');

export default Avatar;
