'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three-stdlib';

// Joint names and limits from the URDF
const JOINT_LIMITS = {
    joint1: { min: -2, max: 2 },      // base rotation
    joint2: { min: -0.279, max: 3.316 }, // shoulder pitch (-16° to 190°)
    joint3: { min: -0.209, max: 3.14159 }, // elbow (-12° to 180°)
    joint4: { min: -1.745, max: 1.745 }, // wrist pitch (-100° to 100°)
    joint5: { min: -3.14158, max: 3.14158 }, // wrist roll
    joint6: { min: -0.2, max: 2.0 }  // gripper
};

// Interface for joint angles
interface JointAngles {
    base: number | null;      // J1 - Base rotation
    shoulder: number | null;  // J2 - Shoulder pitch
    elbow: number | null;     // J3 - Elbow pitch
    wrist1: number | null;    // J4 - Wrist roll
    wrist2: number | null;    // J5 - Wrist pitch
    wrist3: number | null;    // J6 - Wrist yaw
}

// Helper function to convert degrees to radians and clamp within limits
const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);
const radiansToDegrees = (radians: number) => radians * (180 / Math.PI);

const clampJointAngle = (angle: number, jointName: keyof typeof JOINT_LIMITS): number => {
    const limits = JOINT_LIMITS[jointName];
    return Math.max(limits.min, Math.min(limits.max, degreesToRadians(angle)));
};

// Component to load and display STL meshes
function STLMesh({ url, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }: {
    url: string;
    material: THREE.Material;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
}) {
    const geometry = useLoader(STLLoader, url);

    return (
        <mesh
            geometry={geometry}
            material={material}
            position={position}
            rotation={rotation}
            scale={scale}
        />
    );
}

// Camera projection rectangle component
function CameraProjection({ videoElement }: { videoElement?: HTMLVideoElement | null }) {
    // Create video texture when video element is available
    const videoTexture = useMemo(() => {
        if (videoElement) {
            const texture = new THREE.VideoTexture(videoElement);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.format = THREE.RGBFormat;
            texture.colorSpace = THREE.SRGBColorSpace; // Proper color space for video
            return texture;
        }
        return null;
    }, [videoElement]);

    const projectionMaterial = useMemo(() =>
        new THREE.MeshBasicMaterial({
            color: videoTexture ? 0xffffff : '#00ff88', // Use hex for pure white
            transparent: !videoTexture,
            opacity: videoTexture ? 1.0 : 1,
            side: THREE.DoubleSide,
            wireframe: !videoTexture,
            map: videoTexture,
            ...(videoTexture && {
                // When video texture is present, ensure accurate color reproduction
                toneMapped: false, // Disable tone mapping for accurate colors
            })
        }), [videoTexture]
    );

    const projectionGeometry = useMemo(() =>
        new THREE.PlaneGeometry(0.24, 0.16), // 3:2 aspect ratio for camera projection
        []);

    // Create projection lines from camera origin to rectangle corners
    const projectionLines = useMemo(() => {
        const lineGeometries: { geometry: THREE.BufferGeometry; material: THREE.LineBasicMaterial }[] = [];
        const lineMaterial = new THREE.LineBasicMaterial({
            color: '#00ff88',
        });

        // Rectangle corners relative to the rectangle position [0, -0.2, 0]
        const corners = [
            [-0.12, 0, -0.08], // top-left
            [0.12, 0, -0.08],  // top-right
            [-0.12, 0, 0.08],  // bottom-left
            [0.12, 0, 0.08]    // bottom-right
        ];

        corners.forEach(corner => {
            const points = [
                new THREE.Vector3(0, 0.2, 0),     // camera origin (wrist) - offset back to wrist
                new THREE.Vector3(corner[0], corner[1], corner[2]) // corner
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            lineGeometries.push({ geometry, material: lineMaterial });
        });

        return lineGeometries;
    }, []);

    return (
        <group position={[0, -0.2, 0]}> {/* 2m in front of wrist (scaled by 1/50) */}
            {/* Main projection rectangle */}
            <mesh
                geometry={projectionGeometry}
                material={projectionMaterial}
                rotation={[Math.PI / 2, 0, Math.PI]} // Rotate to face forward + 180° rotation
                scale={[-1, 1, 1]} // Horizontally flip the texture
            />


            {/* Projection lines from camera to corners */}
            {projectionLines.map((lineData, index) => (
                <primitive
                    key={index}
                    object={new THREE.Line(lineData.geometry, lineData.material)}
                />
            ))}
        </group>
    );
}

// Component for 3D axis indicators (X=Red, Y=Green, Z=Blue)
function AxisIndicator({ scale = 0.02, opacity = 0.8 }: { scale?: number; opacity?: number }) {
    const axisLength = scale * 2.5; // Extended length for better visibility
    const axisWidth = axisLength * 0.03; // Thinner relative to length but still visible

    return (
        <group>
            {/* X Axis - Red */}
            <mesh position={[axisLength / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[axisWidth, axisWidth, axisLength]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={opacity} />
            </mesh>
            {/* X Axis Arrow Head */}
            <mesh position={[axisLength, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[axisWidth * 3, axisWidth * 4]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={opacity} />
            </mesh>

            {/* Y Axis - Green */}
            <mesh position={[0, axisLength / 2, 0]}>
                <cylinderGeometry args={[axisWidth, axisWidth, axisLength]} />
                <meshBasicMaterial color="#00ff00" transparent opacity={opacity} />
            </mesh>
            {/* Y Axis Arrow Head */}
            <mesh position={[0, axisLength, 0]}>
                <coneGeometry args={[axisWidth * 3, axisWidth * 4]} />
                <meshBasicMaterial color="#00ff00" transparent opacity={opacity} />
            </mesh>

            {/* Z Axis - Blue */}
            <mesh position={[0, 0, axisLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[axisWidth, axisWidth, axisLength]} />
                <meshBasicMaterial color="#0000ff" transparent opacity={opacity} />
            </mesh>
            {/* Z Axis Arrow Head */}
            <mesh position={[0, 0, axisLength]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[axisWidth * 3, axisWidth * 4]} />
                <meshBasicMaterial color="#0000ff" transparent opacity={opacity} />
            </mesh>
        </group>
    );
}

// Component to display joint angle
function JointAngleDisplay({
    position,
    jointName,
    angle,
    color = "#ffffff",
    fontSize = 0.01
}: {
    position: [number, number, number];
    jointName: string;
    angle: number | null;
    color?: string;
    fontSize?: number;
}) {
    const angleText = angle !== null ? `${radiansToDegrees(angle).toFixed(1)}°` : 'N/A';

    return (
        <group position={position}>
            <Text
                fontSize={fontSize}
                color={color}
                anchorX="center"
                anchorY="middle"
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
                renderOrder={999}
                material-depthTest={false}
                material-depthWrite={false}
            >
                {`${jointName}: ${angleText}`}
            </Text>
        </group>
    );
}

// Component to render all joint angle texts in world space
function JointAngleTexts({ jointAngles, currentAngles }: {
    jointAngles?: JointAngles;
    currentAngles: {
        joint1: number | null;
        joint2: number | null;
        joint3: number | null;
        joint4: number | null;
        joint5: number | null;
        joint6: number | null;
    };
}) {
    if (!jointAngles) return null;

    // Fixed world positions for angle displays (scaled appropriately)
    const textPositions = {
        J1: [8, 5, 4] as [number, number, number],
        J2: [8, 8, 4] as [number, number, number],
        J3: [8, 11, 4] as [number, number, number],
        J4: [8, 14, 4] as [number, number, number],
        J5: [8, 17, 4] as [number, number, number],
        J6: [8, 20, 4] as [number, number, number],
    };

    return (
        <group>
            <Text
                position={textPositions.J1}
                fontSize={1.5}
                color="#ffffff"
                anchorX="left"
                anchorY="middle"
            >
                J1: {currentAngles.joint1 !== null ? `${radiansToDegrees(currentAngles.joint1).toFixed(1)}°` : 'N/A'}
            </Text>
            <Text
                position={textPositions.J2}
                fontSize={1.5}
                color="#ffffff"
                anchorX="left"
                anchorY="middle"
            >
                J2: {currentAngles.joint2 !== null ? `${radiansToDegrees(currentAngles.joint2).toFixed(1)}°` : 'N/A'}
            </Text>
            <Text
                position={textPositions.J3}
                fontSize={1.5}
                color="#ffffff"
                anchorX="left"
                anchorY="middle"
            >
                J3: {currentAngles.joint3 !== null ? `${radiansToDegrees(currentAngles.joint3).toFixed(1)}°` : 'N/A'}
            </Text>
            <Text
                position={textPositions.J4}
                fontSize={1.5}
                color="#ffffff"
                anchorX="left"
                anchorY="middle"
            >
                J4: {currentAngles.joint4 !== null ? `${radiansToDegrees(currentAngles.joint4).toFixed(1)}°` : 'N/A'}
            </Text>
            <Text
                position={textPositions.J5}
                fontSize={1.5}
                color="#ffffff"
                anchorX="left"
                anchorY="middle"
            >
                J5: {currentAngles.joint5 !== null ? `${radiansToDegrees(currentAngles.joint5).toFixed(1)}°` : 'N/A'}
            </Text>
            <Text
                position={textPositions.J6}
                fontSize={1.5}
                color="#ffffff"
                anchorX="left"
                anchorY="middle"
            >
                J6: {currentAngles.joint6 !== null ? `${radiansToDegrees(currentAngles.joint6).toFixed(1)}°` : 'N/A'}
            </Text>
        </group>
    );
}

// Component to track gripper position and update camera target
function CameraTargetTracker({
    gripperRef,
    orbitControlsRef
}: {
    gripperRef: React.RefObject<THREE.Group>;
    orbitControlsRef: React.RefObject<any>;
}) {
    const [gripperWorldPosition] = useState(new THREE.Vector3());

    useFrame(() => {
        if (gripperRef.current && orbitControlsRef.current) {
            // Get the world position of the gripper
            gripperRef.current.getWorldPosition(gripperWorldPosition);

            // Update the orbit controls target to follow the gripper
            // This allows the user to orbit around the gripper with mouse controls
            orbitControlsRef.current.target.copy(gripperWorldPosition);
            orbitControlsRef.current.update();
        }
    });

    return null;
}

// SO-ARM100 Robot Component based on URDF
function SOArm100Robot({ videoElement, hasActiveVideoTrack, jointAngles, gripperRef, orbitControlsRef, isLeftArm }: {
    videoElement?: HTMLVideoElement | null;
    hasActiveVideoTrack?: boolean;
    jointAngles?: JointAngles;
    gripperRef: React.RefObject<THREE.Group>;
    orbitControlsRef: React.RefObject<any>;
    isLeftArm: boolean;
}) {
    const armRef = useRef<THREE.Group>(null);
    const joint1Ref = useRef<THREE.Group>(null); // base rotation
    const joint2Ref = useRef<THREE.Group>(null); // shoulder pitch
    const joint3Ref = useRef<THREE.Group>(null); // elbow
    const joint4Ref = useRef<THREE.Group>(null); // wrist pitch
    const joint5Ref = useRef<THREE.Group>(null); // wrist roll
    const joint6Ref = useRef<THREE.Group>(null); // gripper

    // Materials matching URDF
    const materials = useMemo(() => ({
        printed: new THREE.MeshStandardMaterial({
            color: '#ffde1f', // 3d_printed material (1.0 0.82 0.12)
            metalness: 0.1,
            roughness: 0.8
        }),
        motor: new THREE.MeshStandardMaterial({
            color: '#1a1a1a', // sts3215 material (0.1 0.1 0.1)
            metalness: 0.8,
            roughness: 0.2
        })
    }), []);

    // Current joint angles for display
    const currentAngles = useMemo(() => ({
        joint1: jointAngles?.base ? clampJointAngle(jointAngles.base, 'joint1') : null,
        joint2: jointAngles?.shoulder ? clampJointAngle(jointAngles.shoulder, 'joint2') : null,
        joint3: jointAngles?.elbow ? clampJointAngle(jointAngles.elbow, 'joint3') : null,
        joint4: jointAngles?.wrist1 ? clampJointAngle(jointAngles.wrist1, 'joint4') : null,
        joint5: jointAngles?.wrist2 ? clampJointAngle(jointAngles.wrist2, 'joint5') : null,
        joint6: jointAngles?.wrist3 ? clampJointAngle(jointAngles.wrist3, 'joint6') : null,
    }), [jointAngles]);

    // Apply joint angles to the robot
    useEffect(() => {
        if (!jointAngles) return;

        // Apply base rotation (joint1) - Y axis
        if (joint1Ref.current && jointAngles.base !== null) {
            const angle = clampJointAngle(jointAngles.base, 'joint1');
            joint1Ref.current.rotation.y = -angle;
        }

        // Apply shoulder pitch (joint2) - X axis  
        if (joint2Ref.current && jointAngles.shoulder !== null) {
            const angle = clampJointAngle(jointAngles.shoulder, 'joint2');
            joint2Ref.current.rotation.x = -angle + Math.PI / 2;
        }

        // Apply elbow (joint3) - X axis
        if (joint3Ref.current && jointAngles.elbow !== null) {
            const angle = clampJointAngle(jointAngles.elbow, 'joint3');
            joint3Ref.current.rotation.x = angle - Math.PI / 2;
        }

        // Apply wrist pitch (joint4) - X axis
        if (joint4Ref.current && jointAngles.wrist1 !== null) {
            const angle = clampJointAngle(jointAngles.wrist1, 'joint4');
            joint4Ref.current.rotation.x = angle - Math.PI / 2;
        }

        // Apply wrist roll (joint5) - Y axis
        if (joint5Ref.current && jointAngles.wrist2 !== null) {
            const angle = clampJointAngle(jointAngles.wrist2, 'joint5');
            joint5Ref.current.rotation.y = -angle + Math.PI / 2;
        }

        // Apply gripper (joint6) - Z axis
        if (joint6Ref.current && jointAngles.wrist3 !== null) {
            const angle = clampJointAngle(jointAngles.wrist3, 'joint6');
            joint6Ref.current.rotation.z = -angle;
        }
    }, [jointAngles]);

    return (
        <group ref={armRef} position={[0, 0, 0]} scale={[100, 100, 100]}>
            {/* Camera target tracker */}
            <CameraTargetTracker gripperRef={gripperRef} orbitControlsRef={orbitControlsRef} />

            {/* Base Link */}
            <group position={[0, 0, 0]}>
                <STLMesh url="/assets/Base.stl" material={materials.printed} rotation={[-Math.PI / 2, 0, 0]} />
                <STLMesh url="/assets/Base_Motor.stl" material={materials.motor} rotation={[-Math.PI / 2, 0, 0]} />

                {/* Joint 1: Base rotation */}
                <group ref={joint1Ref} position={[0, .017, 0.045]}>
                    <AxisIndicator scale={0.03} />
                    <JointAngleDisplay
                        position={[0.08, 0.02, 0]}
                        jointName="J1"
                        angle={currentAngles.joint1}
                        fontSize={0.015}
                        color="#ffffff"
                    />
                    <STLMesh url="/assets/Rotation_Pitch.stl" material={materials.printed} />
                    <STLMesh url="/assets/Rotation_Pitch_Motor.stl" material={materials.motor} />

                    {/* Joint 2: Shoulder pitch */}
                    <group ref={joint2Ref} position={[0, 0.1025, 0.0306]}>
                        <AxisIndicator scale={0.025} />
                        <JointAngleDisplay
                            position={[0.07, 0.02, 0]}
                            jointName="J2"
                            angle={currentAngles.joint2}
                            fontSize={0.013}
                            color="#ffffff"
                        />
                        <STLMesh url="/assets/Upper_Arm.stl" material={materials.printed} />
                        <STLMesh url="/assets/Upper_Arm_Motor.stl" material={materials.motor} />

                        {/* Joint 3: Elbow */}
                        <group ref={joint3Ref} position={[0, 0.11257, 0.028]}>
                            <AxisIndicator scale={0.02} />
                            <JointAngleDisplay
                                position={[0.06, 0.02, 0]}
                                jointName="J3"
                                angle={currentAngles.joint3}
                                fontSize={0.012}
                                color="#ffffff"
                            />
                            <STLMesh url="/assets/Lower_Arm.stl" material={materials.printed} />
                            <STLMesh url="/assets/Lower_Arm_Motor.stl" material={materials.motor} />

                            {/* Joint 4: Wrist pitch */}
                            <group ref={joint4Ref} position={[0, 0.0052, 0.1349]}>
                                <AxisIndicator scale={0.015} />
                                <JointAngleDisplay
                                    position={[0.05, 0.02, 0]}
                                    jointName="J4"
                                    angle={currentAngles.joint4}
                                    fontSize={0.011}
                                    color="#ffffff"
                                />
                                <STLMesh url="/assets/Wrist_Pitch_Roll.stl" material={materials.printed} />
                                <STLMesh url="/assets/Wrist_Pitch_Roll_Motor.stl" material={materials.motor} />

                                {/* Joint 5: Wrist roll */}
                                <group ref={joint5Ref} position={[0, -0.0601, 0]}>
                                    <AxisIndicator scale={0.012} />
                                    <JointAngleDisplay
                                        position={[0.04, 0.02, 0]}
                                        jointName="J5"
                                        angle={currentAngles.joint5}
                                        fontSize={0.01}
                                        color="#ffffff"
                                    />
                                    <STLMesh url="/assets/Fixed_Jaw.stl" material={materials.printed} />
                                    <STLMesh url="/assets/Fixed_Jaw_Motor.stl" material={materials.motor} />

                                    {/* Camera projection from wrist */}
                                    {hasActiveVideoTrack && <CameraProjection videoElement={videoElement} />}

                                    {/* Joint 6: Gripper - This is our target reference */}
                                    <group ref={joint6Ref} position={[-0.0202, -0.0244, 0]}>
                                        <AxisIndicator scale={0.01} />
                                        <JointAngleDisplay
                                            position={[0.035, 0.02, 0]}
                                            jointName="J6"
                                            angle={currentAngles.joint6}
                                            fontSize={0.009}
                                            color="#ffffff"
                                        />
                                        {/* Gripper target point */}
                                        <group ref={gripperRef} position={[0, 0, 0]}>
                                            <STLMesh url="/assets/Moving_Jaw.stl" material={materials.printed} rotation={[0, Math.PI, 0]} />
                                        </group>
                                    </group>
                                </group>
                            </group>
                        </group>
                    </group>
                </group>
            </group>
        </group>
    );
}


// Component to set scene background
function SceneBackground() {
    const { scene } = useThree();

    useEffect(() => {
        scene.background = new THREE.Color('#222222');
    }, [scene]);

    return null;
}

// Main RobotArm3D component
export function RobotArm3D({
    videoElement,
    hasActiveVideoTrack = false,
    jointAngles,
    leftJointAngles,
    leftArmVideoElement,
    hasActiveLeftVideoTrack = false
}: {
    videoElement?: HTMLVideoElement | null;
    hasActiveVideoTrack?: boolean;
    jointAngles?: JointAngles;
    leftJointAngles?: JointAngles;
    leftArmVideoElement?: HTMLVideoElement | null;
    hasActiveLeftVideoTrack?: boolean;
} = {}) {
    const gripperRef = useRef<THREE.Group>(null);
    const leftGripperRef = useRef<THREE.Group>(null);
    const orbitControlsRef = useRef<any>(null);

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden">
            <Canvas
                camera={{ position: [0, 30, 30], fov: 80 }}
                style={{ width: '100%', height: '100%' }}
            >
                {/* Scene background */}
                <SceneBackground />

                {/* Lighting setup */}
                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[20, 20, 10]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />
                <pointLight position={[-10, 10, 10]} intensity={0.6} color="#4a90ff" />
                <pointLight position={[10, -10, -10]} intensity={0.4} color="#ff6b35" />

                {/* Grid floor */}
                <Grid
                    infiniteGrid
                    cellSize={1.0}
                    cellThickness={0.5}
                    cellColor="#dddddd"
                    sectionSize={10}
                    sectionThickness={1}
                    sectionColor="#cccccc"
                    fadeDistance={100}
                    fadeStrength={1}
                />

                {/* Right SO-ARM100 Robot (moved to the right) */}
                <group position={[-30, 0, 0]}> {/* 300mm = 0.3m * 100 (scale factor) = 30 units to the right (positive X) */}
                    <SOArm100Robot
                        videoElement={videoElement}
                        hasActiveVideoTrack={hasActiveVideoTrack}
                        jointAngles={jointAngles}
                        gripperRef={gripperRef}
                        orbitControlsRef={orbitControlsRef}
                        isLeftArm={false}
                    />
                </group>

                {/* Left SO-ARM100 Robot (center position) */}
                <SOArm100Robot
                    videoElement={leftArmVideoElement}
                    hasActiveVideoTrack={hasActiveLeftVideoTrack}
                    jointAngles={leftJointAngles}
                    gripperRef={leftGripperRef}
                    orbitControlsRef={orbitControlsRef}
                    isLeftArm={true}
                />

                {/* Joint Angle Texts for Right Arm */}
                <group position={[-30, 0, 0]}> {/* Position text displays with the right arm */}
                    <JointAngleTexts jointAngles={jointAngles} currentAngles={{
                        joint1: jointAngles?.base ? clampJointAngle(jointAngles.base, 'joint1') : null,
                        joint2: jointAngles?.shoulder ? clampJointAngle(jointAngles.shoulder, 'joint2') : null,
                        joint3: jointAngles?.elbow ? clampJointAngle(jointAngles.elbow, 'joint3') : null,
                        joint4: jointAngles?.wrist1 ? clampJointAngle(jointAngles.wrist1, 'joint4') : null,
                        joint5: jointAngles?.wrist2 ? clampJointAngle(jointAngles.wrist2, 'joint5') : null,
                        joint6: jointAngles?.wrist3 ? clampJointAngle(jointAngles.wrist3, 'joint6') : null,
                    }} />
                </group>

                {/* Joint Angle Texts for Left Arm */}
                {leftJointAngles && (
                    <JointAngleTexts jointAngles={leftJointAngles} currentAngles={{
                        joint1: leftJointAngles?.base ? clampJointAngle(leftJointAngles.base, 'joint1') : null,
                        joint2: leftJointAngles?.shoulder ? clampJointAngle(leftJointAngles.shoulder, 'joint2') : null,
                        joint3: leftJointAngles?.elbow ? clampJointAngle(leftJointAngles.elbow, 'joint3') : null,
                        joint4: leftJointAngles?.wrist1 ? clampJointAngle(leftJointAngles.wrist1, 'joint4') : null,
                        joint5: leftJointAngles?.wrist2 ? clampJointAngle(leftJointAngles.wrist2, 'joint5') : null,
                        joint6: leftJointAngles?.wrist3 ? clampJointAngle(leftJointAngles.wrist3, 'joint6') : null,
                    }} />
                )}

                {/* Camera controls - now follows gripper */}
                <OrbitControls
                    ref={orbitControlsRef}
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={8}
                    maxDistance={60}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2}
                    enableDamping={true}
                    dampingFactor={0.05}
                />
            </Canvas>
        </div>
    );
} 