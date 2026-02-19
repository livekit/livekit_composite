"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { AgentState } from "@livekit/components-react";
import { useTheme } from "next-themes";

const accentColor = "#f97316";

const Shape: React.FC<{
  volume: number;
  state: AgentState;
  theme?: string;
}> = ({ volume, state, theme }) => {
  const meshRef = useRef<THREE.Group>(null);

  const emissiveColor = useRef(new THREE.Color(accentColor));
  const targetColor = useRef(new THREE.Color(accentColor));
  const isDisconnected = state === "disconnected";

  // Theme-aware disconnected color
  const disconnectedColor = theme === "light" ? "#1a1a1a" : "#3a3a3a";

  useFrame((frameState) => {
    if (meshRef.current) {
      if (state !== "speaking") {
        if (state === "disconnected") {
          meshRef.current.rotation.y += 0.008;
          meshRef.current.rotation.x = -0.15;
        } else {
          meshRef.current.rotation.y += 0.005;
          meshRef.current.rotation.x = 0;
        }
      } else {
        meshRef.current.rotation.y = THREE.MathUtils.lerp(
          meshRef.current.rotation.y,
          Math.round(meshRef.current.rotation.y / Math.PI) * Math.PI,
          0.05
        );
      }

      if (state === "disconnected") {
        meshRef.current.position.y = THREE.MathUtils.lerp(
          meshRef.current.position.y,
          -1,
          0.1
        );
      } else {
        const elapsedTime = frameState.clock.getElapsedTime();
        meshRef.current.position.y = THREE.MathUtils.lerp(
          meshRef.current.position.y,
          Math.sin(elapsedTime * 3) * 0.1,
          0.1
        );
      }

      const scale = THREE.MathUtils.lerp(
        meshRef.current.scale.x,
        1 + volume * 0.5,
        0.2
      );
      meshRef.current.scale.setScalar(scale);

      const targetHex = isDisconnected ? disconnectedColor : accentColor;
      targetColor.current.set(targetHex);
      emissiveColor.current.lerp(targetColor.current, 0.1);

      // Update material on all child meshes
      meshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.emissive = emissiveColor.current;
          mat.emissiveIntensity = isDisconnected
            ? 1.2
            : volume > 0
              ? 3.5
              : 0.25;
        }
      });
    }
  });

  // Create the Grok orbital logo shape
  const createGrokOrbitalShape = (): THREE.Shape => {
    const shape = new THREE.Shape();
    const scale = 0.08;

    // First orbital swoosh (top-right to bottom-left)
    shape.moveTo(13.2371 * scale, -21.0407 * scale);
    shape.lineTo(24.3186 * scale, -12.8506 * scale);
    shape.bezierCurveTo(
      24.8619 * scale,
      -12.4491 * scale,
      25.6384 * scale,
      -12.6057 * scale,
      25.8973 * scale,
      -13.2294 * scale
    );
    shape.bezierCurveTo(
      27.2597 * scale,
      -16.5185 * scale,
      26.651 * scale,
      -20.4712 * scale,
      23.9403 * scale,
      -23.1851 * scale
    );
    shape.bezierCurveTo(
      21.2297 * scale,
      -25.8989 * scale,
      17.4581 * scale,
      -26.4941 * scale,
      14.0108 * scale,
      -25.1386 * scale
    );
    shape.lineTo(10.2449 * scale, -26.8843 * scale);
    shape.bezierCurveTo(
      15.6463 * scale,
      -30.5806 * scale,
      22.2053 * scale,
      -29.6665 * scale,
      26.304 * scale,
      -25.5601 * scale
    );
    shape.bezierCurveTo(
      29.5551 * scale,
      -22.3051 * scale,
      30.562 * scale,
      -17.8683 * scale,
      29.6205 * scale,
      -13.8673 * scale
    );
    shape.bezierCurveTo(
      28.2637 * scale,
      -7.99809 * scale,
      29.9647 * scale,
      -5.64871 * scale,
      33.449 * scale,
      -0.844576 * scale
    );
    shape.lineTo(29.1113 * scale, -5.09055 * scale);
    shape.lineTo(13.2343 * scale, -21.0436 * scale);

    return shape;
  };

  const createGrokOrbitalShape2 = (): THREE.Shape => {
    const shape = new THREE.Shape();
    const scale = 0.08;

    // Second orbital swoosh (bottom-left to top-right)
    shape.moveTo(10.9503 * scale, -23.0313 * scale);
    shape.bezierCurveTo(
      7.07343 * scale,
      -19.3235 * scale,
      7.74185 * scale,
      -13.5853 * scale,
      11.0498 * scale,
      -10.2763 * scale
    );
    shape.bezierCurveTo(
      13.4959 * scale,
      -7.82722 * scale,
      17.5036 * scale,
      -6.82767 * scale,
      21.0021 * scale,
      -8.2971 * scale
    );
    shape.lineTo(24.7595 * scale, -6.55998 * scale);
    shape.bezierCurveTo(
      24.0826 * scale,
      -6.07017 * scale,
      23.215 * scale,
      -5.54334 * scale,
      22.2195 * scale,
      -5.17313 * scale
    );
    shape.bezierCurveTo(
      17.7198 * scale,
      -3.31926 * scale,
      12.3326 * scale,
      -4.24192 * scale,
      8.67479 * scale,
      -7.90126 * scale
    );
    shape.bezierCurveTo(
      5.15635 * scale,
      -11.4239 * scale,
      4.0499 * scale,
      -16.8403 * scale,
      5.94992 * scale,
      -21.4622 * scale
    );
    shape.bezierCurveTo(
      7.36924 * scale,
      -24.9165 * scale,
      5.04257 * scale,
      -27.3598 * scale,
      2.69884 * scale,
      -29.826 * scale
    );
    shape.lineTo(0.36364 * scale, -32.5 * scale);
    shape.lineTo(10.9474 * scale, -23.0341 * scale);

    return shape;
  };

  const shape1 = createGrokOrbitalShape();
  const shape2 = createGrokOrbitalShape2();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.15,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 12,
  };

  const geometry1 = new THREE.ExtrudeGeometry(shape1, extrudeSettings);
  const geometry2 = new THREE.ExtrudeGeometry(shape2, extrudeSettings);

  // Center each geometry individually, then offset to prevent overlap
  geometry1.center();
  geometry2.center();

  // Offset the shapes so they don't overlap - create the orbital ring effect
  geometry1.translate(0.3, 0.5, 0);
  geometry2.translate(-0.4, 0.3, 0);

  const createSolidColorTexture = (color: string): THREE.CanvasTexture => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 512;
    canvas.height = 512;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return new THREE.CanvasTexture(canvas);
  };

  const texture = createSolidColorTexture(
    isDisconnected ? disconnectedColor : accentColor
  );

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    roughness: isDisconnected ? 0.8 : 1,
    metalness: isDisconnected ? 0.2 : 0.6,
    side: THREE.DoubleSide,
    emissive: emissiveColor.current,
    emissiveIntensity: 0.25,
  });

  return (
    <group ref={meshRef}>
      <mesh geometry={geometry1} material={material} />
      <mesh geometry={geometry2} material={material} />
    </group>
  );
};

export const GrokMark = ({
  volume,
  state,
}: {
  volume: number;
  state: AgentState;
}) => {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
      <ambientLight intensity={1} />
      <pointLight position={[2, 0, 0]} intensity={5} />
      <Shape volume={volume} state={state} theme={currentTheme} />
      <Environment preset="night" background={false} />
      <EffectComposer>
        <Bloom
          intensity={state === "disconnected" ? 0.5 : volume > 0 ? 2 : 0}
          radius={50}
          luminanceThreshold={0.0}
          luminanceSmoothing={1}
        />
      </EffectComposer>
    </Canvas>
  );
};
