import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJarvisState } from '../../jarvisState';

export interface NuclearCoreProps {
  className?: string;
}

const PARTICLE_COUNT = 2000;

// GLSL Shaders for Central Plasma Core
const coreVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying float vFresnel;

uniform float uTime;
uniform float uTurbulence;
uniform float uGlitch;

float cheapNoise(vec3 p) {
  return sin(p.x * 3.5 + uTime * 2.2) * cos(p.y * 3.5 + uTime * 1.8) * sin(p.z * 3.5 + uTime * 2.5);
}

void main() {
  vNormal = normalize(normalMatrix * normal);
  
  float noiseVal = cheapNoise(position * 1.5 + vec3(uTime * 0.4));
  float displacement = noiseVal * (0.06 + uTurbulence * 0.16);
  
  vec3 pos = position;
  if (uGlitch > 0.5) {
    float jitter = sin(uTime * 45.0 + position.y * 25.0);
    if (abs(jitter) > 0.3) {
      pos.x += jitter * 0.08;
      pos.z += jitter * 0.05;
    }
  }

  vec3 newPosition = pos + normal * displacement;
  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  
  vec3 viewDir = normalize(-mvPosition.xyz);
  vFresnel = pow(1.0 - clamp(dot(viewDir, vNormal), 0.0, 1.0), 2.2);

  vPosition = newPosition;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const coreFragmentShader = `
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform float uTime;
uniform float uPulse;
uniform float uGlitch;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vFresnel;

void main() {
  float pattern = sin(vPosition.x * 5.0 + vPosition.y * 5.0 + uTime * 3.0) * 0.5 + 0.5;
  vec3 baseColor = mix(uPrimaryColor, uSecondaryColor, pattern);
  
  float pulseFactor = 1.0 + sin(uTime * 4.0) * uPulse * 0.35;
  vec3 rimColor = mix(uSecondaryColor, vec3(1.0), 0.5) * vFresnel * 1.6 * pulseFactor;
  
  vec3 finalColor = baseColor + rimColor;
  
  if (uGlitch > 0.5) {
    float glitchStripes = step(0.85, sin(gl_FragCoord.y * 0.15 + uTime * 40.0));
    if (glitchStripes > 0.5) {
      finalColor = finalColor.gbr * 1.25;
    }
  }

  gl_FragColor = vec4(finalColor, 0.88 + vFresnel * 0.12);
}
`;

// GLSL Shaders for Particle Field
const particleVertexShader = `
attribute vec3 aRandom;
attribute float aSize;

uniform float uTime;
uniform float uParticleSpeed;
uniform float uCognitiveLoad;
uniform float uGlitch;

varying float vPhase;

void main() {
  float phase = aRandom.x;
  float speedMult = aRandom.y;
  float orbitRadius = aRandom.z;

  float speed = (0.3 + uParticleSpeed * 0.7) * speedMult;
  float angle = uTime * speed + phase * 6.283185;

  float r = orbitRadius + sin(uTime * 1.5 + phase * 6.283185) * 0.25 * uCognitiveLoad;
  vec3 animatedPos;
  animatedPos.x = r * cos(angle);
  animatedPos.z = r * sin(angle);
  animatedPos.y = position.y + sin(angle * 2.0 + phase) * (0.35 + uCognitiveLoad * 0.45);

  if (uGlitch > 0.5) {
    float jitter = sin(uTime * 50.0 + phase * 12.0);
    if (abs(jitter) > 0.4) {
      animatedPos += vec3(jitter * 0.18, jitter * 0.12, jitter * 0.18);
    }
  }

  vPhase = phase;
  vec4 mvPosition = modelViewMatrix * vec4(animatedPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float sizeBoost = 1.0 + uCognitiveLoad * 0.7;
  gl_PointSize = aSize * sizeBoost * (180.0 / -mvPosition.z);
}
`;

const particleFragmentShader = `
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform float uTime;
uniform float uGlitch;

varying float vPhase;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float alpha = pow(smoothstep(0.5, 0.0, dist), 1.4);
  float mixFactor = sin(vPhase * 6.283185 + uTime * 2.5) * 0.5 + 0.5;
  vec3 pColor = mix(uPrimaryColor, uSecondaryColor, mixFactor);

  if (uGlitch > 0.5) {
    if (sin(vPhase * 20.0 + uTime * 35.0) > 0.35) {
      pColor = vec3(1.0, 0.25, 0.4);
    }
  }

  gl_FragColor = vec4(pColor, alpha * 0.85);
}
`;

/** Central Plasma Shader Mesh */
const PlasmaSphere: React.FC = () => {
  const { theme, cognitiveLoad } = useJarvisState();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const targetPrimary = useMemo(() => new THREE.Color(theme.primary), [theme.primary]);
  const targetSecondary = useMemo(() => new THREE.Color(theme.secondary), [theme.secondary]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTurbulence: { value: cognitiveLoad },
      uPulse: { value: theme.pulse },
      uGlitch: { value: theme.glitch ? 1.0 : 0.0 },
      uPrimaryColor: { value: new THREE.Color(theme.primary) },
      uSecondaryColor: { value: new THREE.Color(theme.secondary) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    const mat = materialRef.current;
    mat.uniforms.uTime.value += delta;
    mat.uniforms.uPrimaryColor.value.lerp(targetPrimary, Math.min(1, delta * 5));
    mat.uniforms.uSecondaryColor.value.lerp(targetSecondary, Math.min(1, delta * 5));
    mat.uniforms.uTurbulence.value += (cognitiveLoad - mat.uniforms.uTurbulence.value) * Math.min(1, delta * 5);
    mat.uniforms.uPulse.value += (theme.pulse - mat.uniforms.uPulse.value) * Math.min(1, delta * 5);
    mat.uniforms.uGlitch.value = theme.glitch ? 1.0 : 0.0;
  });

  return (
    <mesh>
      <icosahedronGeometry args={[0.85, 4]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={coreVertexShader}
        fragmentShader={coreFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};

/** Rotating Torus Rings */
const CoreRings: React.FC = () => {
  const { theme } = useJarvisState();
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  const ring1MatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ring2MatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ring3MatRef = useRef<THREE.MeshStandardMaterial>(null);

  const targetPrimary = useMemo(() => new THREE.Color(theme.primary), [theme.primary]);
  const targetSecondary = useMemo(() => new THREE.Color(theme.secondary), [theme.secondary]);

  useFrame((_, delta) => {
    const speed = theme.rotationSpeed;

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 0.4 * speed;
      ring1Ref.current.rotation.y += delta * 0.6 * speed;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= delta * 0.8 * speed;
      ring2Ref.current.rotation.z += delta * 0.5 * speed;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x += delta * 1.1 * speed;
      ring3Ref.current.rotation.z -= delta * 0.9 * speed;
    }

    if (ring1MatRef.current) {
      ring1MatRef.current.emissive.lerp(targetPrimary, Math.min(1, delta * 5));
      ring1MatRef.current.color.lerp(targetPrimary, Math.min(1, delta * 5));
    }
    if (ring2MatRef.current) {
      ring2MatRef.current.emissive.lerp(targetSecondary, Math.min(1, delta * 5));
      ring2MatRef.current.color.lerp(targetSecondary, Math.min(1, delta * 5));
    }
    if (ring3MatRef.current) {
      ring3MatRef.current.emissive.lerp(targetPrimary, Math.min(1, delta * 5));
      ring3MatRef.current.color.lerp(targetPrimary, Math.min(1, delta * 5));
    }
  });

  return (
    <group>
      {/* Outer Ring */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2.2, 0.02, 10, 56]} />
        <meshStandardMaterial
          ref={ring1MatRef}
          color={theme.primary}
          emissive={theme.primary}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Middle Ring */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 4, Math.PI / 6, 0]}>
        <torusGeometry args={[1.75, 0.025, 10, 56]} />
        <meshStandardMaterial
          ref={ring2MatRef}
          color={theme.secondary}
          emissive={theme.secondary}
          emissiveIntensity={0.9}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Inner Ring */}
      <mesh ref={ring3Ref} rotation={[Math.PI / 3, 0, Math.PI / 4]}>
        <torusGeometry args={[1.3, 0.03, 10, 56]} />
        <meshStandardMaterial
          ref={ring3MatRef}
          color={theme.primary}
          emissive={theme.primary}
          emissiveIntensity={1.0}
          roughness={0.15}
          metalness={0.85}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  );
};

/** GPU Particle Field (1 Draw Call, ~2000 Particles) */
const ParticleField: React.FC = () => {
  const { theme, cognitiveLoad } = useJarvisState();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const targetPrimary = useMemo(() => new THREE.Color(theme.primary), [theme.primary]);
  const targetSecondary = useMemo(() => new THREE.Color(theme.secondary), [theme.secondary]);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const randoms = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Position around core
      const radius = 0.9 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2.2;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Random attributes for GPU animation
      randoms[i * 3] = Math.random(); // Phase
      randoms[i * 3 + 1] = 0.5 + Math.random() * 1.0; // Speed multiplier
      randoms[i * 3 + 2] = radius; // Orbit radius

      // Sizes
      sizes[i] = 2.0 + Math.random() * 4.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const unis = {
      uTime: { value: 0 },
      uParticleSpeed: { value: theme.particleSpeed },
      uCognitiveLoad: { value: cognitiveLoad },
      uGlitch: { value: theme.glitch ? 1.0 : 0.0 },
      uPrimaryColor: { value: new THREE.Color(theme.primary) },
      uSecondaryColor: { value: new THREE.Color(theme.secondary) },
    };

    return { geometry: geo, uniforms: unis };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    const mat = materialRef.current;
    mat.uniforms.uTime.value += delta;
    mat.uniforms.uPrimaryColor.value.lerp(targetPrimary, Math.min(1, delta * 5));
    mat.uniforms.uSecondaryColor.value.lerp(targetSecondary, Math.min(1, delta * 5));
    mat.uniforms.uParticleSpeed.value += (theme.particleSpeed - mat.uniforms.uParticleSpeed.value) * Math.min(1, delta * 5);
    mat.uniforms.uCognitiveLoad.value += (cognitiveLoad - mat.uniforms.uCognitiveLoad.value) * Math.min(1, delta * 5);
    mat.uniforms.uGlitch.value = theme.glitch ? 1.0 : 0.0;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/** Scene Inner Container with Mouse Parallax */
const SceneContent: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { theme } = useJarvisState();

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    // Mouse Parallax tilt lerp
    const targetX = -state.pointer.y * 0.15;
    const targetY = state.pointer.x * 0.15;

    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * Math.min(1, delta * 4.0);
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * Math.min(1, delta * 4.0);
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 0]} intensity={2.0} color={theme.primary} distance={6} />
      <PlasmaSphere />
      <CoreRings />
      <ParticleField />
    </group>
  );
};

export const NuclearCore: React.FC<NuclearCoreProps> = ({ className = '' }) => {
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className={`relative w-full h-full min-h-[300px] overflow-hidden ${className}`}>
      <Canvas
        dpr={[1, 1.75]}
        frameloop={isDocumentHidden ? 'never' : 'always'}
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
};

export default NuclearCore;
