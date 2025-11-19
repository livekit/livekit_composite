'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { RemoteTrack } from 'livekit-client';

// Interface for joint angles (matching the one in robot-arm-3d.tsx)
interface JointAngles {
    base: number | null;      // J1 - Base rotation
    shoulder: number | null;  // J2 - Shoulder pitch
    elbow: number | null;     // J3 - Elbow pitch
    wrist1: number | null;    // J4 - Wrist roll
    wrist2: number | null;    // J5 - Wrist pitch
    wrist3: number | null;    // J6 - Wrist yaw
}

const LoadingOverlay = () => (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/50 text-center text-fg2">
        <div className="mb-4 h-14 w-14 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-sm font-semibold text-white">Loading 3D visualization…</p>
        <p className="text-xs text-fg3">Initializing robot arm</p>
    </div>
);

// Dynamically import the RobotArm3D component with SSR disabled
const RobotArm3D = dynamic(() => import('./robot-arm-3d').then(mod => ({ default: mod.RobotArm3D })), {
    ssr: false,
    loading: () => <LoadingOverlay />,
});

export function RobotArm3DWrapper({
    videoElement,
    robotArmVideoElement,
    robotArmVideoTrack,
    robotLeftArmVideoElement,
    robotLeftArmVideoTrack,
    jointAngles,
    leftJointAngles
}: {
    videoElement?: HTMLVideoElement | null;
    robotArmVideoElement?: HTMLVideoElement | null;
    robotArmVideoTrack?: RemoteTrack | null;
    robotLeftArmVideoElement?: HTMLVideoElement | null;
    robotLeftArmVideoTrack?: RemoteTrack | null;
    jointAngles?: JointAngles;
    leftJointAngles?: JointAngles;
} = {}) {
    return (
        <Suspense fallback={<LoadingOverlay />}>
            <RobotArm3D
                videoElement={robotArmVideoElement}
                hasActiveVideoTrack={!!robotArmVideoTrack}
                leftArmVideoElement={robotLeftArmVideoElement}
                hasActiveLeftVideoTrack={!!robotLeftArmVideoTrack}
                jointAngles={jointAngles}
                leftJointAngles={leftJointAngles}
            />
        </Suspense>
    );
} 
