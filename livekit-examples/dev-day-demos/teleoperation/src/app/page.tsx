'use client';

import {
  CogIcon,
  ChartBarIcon,
  CameraIcon,
  UserIcon,
  HomeIcon,
  CubeIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { Room, RoomEvent, RemoteTrack, Track, ConnectionState, RemoteParticipant, DataPacket_Kind } from 'livekit-client';
import Image from "next/image";
import Link from "next/link";
import { LiveVideoFeed } from "@/components/live-video-feed";
import { RobotArm3DWrapper } from "@/components/robot-arm-3d-wrapper";
import { JointPositionGraph } from "@/components/joint-position-graph";
import { NavigationSidebar } from "@/components/navigation-sidebar";

// Joint colors to match the graph
const JOINT_COLORS = {
  base: '#00ff88',      // Bright green - J1
  shoulder: '#ff0088',  // Bright pink - J2
  elbow: '#0088ff',     // Bright blue - J3
  wrist1: '#ffaa00',    // Bright orange - J4
  wrist2: '#aa00ff',    // Bright purple - J5
  wrist3: '#88ff00',    // Bright lime - J6
};

const JOINT_CARD_CONFIG = [
  { key: 'base', label: 'Base joint', code: 'J1' },
  { key: 'shoulder', label: 'Shoulder', code: 'J2' },
  { key: 'elbow', label: 'Elbow', code: 'J3' },
  { key: 'wrist1', label: 'Wrist pitch', code: 'J4' },
  { key: 'wrist2', label: 'Wrist roll', code: 'J5' },
  { key: 'wrist3', label: 'Gripper', code: 'J6' },
] as const;

type JointKey = (typeof JOINT_CARD_CONFIG)[number]['key'];

// Interface for robot arm position data
interface RobotArmPosition {
  timestamp: number;
  jointAngles: {
    base: number;      // J1 - Base rotation
    shoulder: number;  // J2 - Shoulder pitch
    elbow: number;     // J3 - Elbow pitch
    wrist1: number;    // J4 - Wrist roll
    wrist2: number;    // J5 - Wrist pitch
    wrist3: number;    // J6 - Wrist yaw
  };
  status?: {
    base: 'active' | 'inactive' | 'error' | 'offline';
    shoulder: 'active' | 'inactive' | 'error' | 'offline';
    elbow: 'active' | 'inactive' | 'error' | 'offline';
    wrist1: 'active' | 'inactive' | 'error' | 'offline';
    wrist2: 'active' | 'inactive' | 'error' | 'offline';
    wrist3: 'active' | 'inactive' | 'error' | 'offline';
  };
}

// Interface for incoming leader data format
interface LeaderArmData {
  leader_arm_positions: {
    right: number[]; // Array of 6 joint angles
    left: number[];  // Array of 6 joint angles for left arm
  };
}

export default function LandingPage() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [robotArmVideoElement, setRobotArmVideoElement] = useState<HTMLVideoElement | null>(null);
  const [robotLeftArmVideoElement, setRobotLeftArmVideoElement] = useState<HTMLVideoElement | null>(null);

  // LiveKit room state
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Separate tracks for each camera
  const [robotCamVideoTrack, setRobotCamVideoTrack] = useState<RemoteTrack | null>(null);
  const [robotLeftArmCamVideoTrack, setRobotLeftArmCamVideoTrack] = useState<RemoteTrack | null>(null);
  const [robotRightArmCamVideoTrack, setRobotRightArmCamVideoTrack] = useState<RemoteTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<RemoteTrack | null>(null);

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participantIdentity, setParticipantIdentity] = useState<string>('');
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);

  // Right arm joint angles (in degrees) - now updated from LiveKit
  const [jointAngles, setJointAngles] = useState({
    base: null as number | null,      // J1 - Base rotation
    shoulder: null as number | null,  // J2 - Shoulder pitch
    elbow: null as number | null,     // J3 - Elbow pitch
    wrist1: null as number | null,    // J4 - Wrist roll
    wrist2: null as number | null,    // J5 - Wrist pitch
    wrist3: null as number | null     // J6 - Wrist yaw
  });

  // Left arm joint angles (in degrees)
  const [leftJointAngles, setLeftJointAngles] = useState({
    base: null as number | null,      // J1 - Base rotation
    shoulder: null as number | null,  // J2 - Shoulder pitch
    elbow: null as number | null,     // J3 - Elbow pitch
    wrist1: null as number | null,    // J4 - Wrist roll
    wrist2: null as number | null,    // J5 - Wrist pitch
    wrist3: null as number | null     // J6 - Wrist yaw
  });

  // Right arm joint status tracking
  const [jointStatus, setJointStatus] = useState({
    base: 'inactive' as 'active' | 'inactive' | 'error' | 'offline',
    shoulder: 'inactive' as 'active' | 'inactive' | 'error' | 'offline',
    elbow: 'inactive' as 'active' | 'inactive' | 'error' | 'offline',
    wrist1: 'inactive' as 'active' | 'inactive' | 'error' | 'offline',
    wrist2: 'inactive' as 'active' | 'inactive' | 'error' | 'offline',
    wrist3: 'inactive' as 'active' | 'inactive' | 'error' | 'offline',
  });

  // Left arm joint status tracking
  const [leftJointStatus, setLeftJointStatus] = useState({
    base: 'offline' as 'active' | 'inactive' | 'error' | 'offline',
    shoulder: 'offline' as 'active' | 'inactive' | 'error' | 'offline',
    elbow: 'offline' as 'active' | 'inactive' | 'error' | 'offline',
    wrist1: 'offline' as 'active' | 'inactive' | 'error' | 'offline',
    wrist2: 'offline' as 'active' | 'inactive' | 'error' | 'offline',
    wrist3: 'offline' as 'active' | 'inactive' | 'error' | 'offline',
  });

  // Track last position update time
  const [lastPositionUpdate, setLastPositionUpdate] = useState<number | null>(null);
  const [lastLeftPositionUpdate, setLastLeftPositionUpdate] = useState<number | null>(null);
  const [positionDataLive, setPositionDataLive] = useState(false);

  const handleVideoElementReady = (element: HTMLVideoElement | null) => {
    setVideoElement(element);
  };

  const handleRobotLeftArmVideoElementReady = (element: HTMLVideoElement | null) => {
    setRobotLeftArmVideoElement(element);
  };

  const handleRobotRightArmVideoElementReady = (element: HTMLVideoElement | null) => {
    setRobotArmVideoElement(element);
  };

  // Handle incoming robot arm position data from LiveKit - Right Arm
  const handleRobotArmPositionData = (data: RobotArmPosition) => {
    console.log('=== UPDATING RIGHT ARM UI STATE ===');
    console.log('Received right arm position data:', data);

    // Update joint angles
    console.log('Previous right arm joint angles:', jointAngles);
    setJointAngles(data.jointAngles);
    console.log('Setting new right arm joint angles:', data.jointAngles);

    // Update joint status if provided
    if (data.status) {
      console.log('Previous right arm joint status:', jointStatus);
      setJointStatus(data.status);
      console.log('Setting new right arm joint status:', data.status);
    }

    // Update timestamp tracking
    console.log('Previous timestamp:', lastPositionUpdate);
    setLastPositionUpdate(data.timestamp);
    console.log('Setting new timestamp:', data.timestamp);

    setPositionDataLive(true);
    console.log('Marked position data as live (actively receiving data)');
    console.log('=== END UPDATING RIGHT ARM UI STATE ===');
  };

  // Handle incoming robot arm position data from LiveKit - Left Arm
  const handleLeftRobotArmPositionData = (data: RobotArmPosition) => {
    console.log('=== UPDATING LEFT ARM UI STATE ===');
    console.log('Received left arm position data:', data);

    // Update joint angles
    console.log('Previous left arm joint angles:', leftJointAngles);
    setLeftJointAngles(data.jointAngles);
    console.log('Setting new left arm joint angles:', data.jointAngles);

    // Update joint status if provided
    if (data.status) {
      console.log('Previous left arm joint status:', leftJointStatus);
      setLeftJointStatus(data.status);
      console.log('Setting new left arm joint status:', data.status);
    }

    // Update left arm timestamp tracking
    console.log('Previous left arm timestamp:', lastLeftPositionUpdate);
    setLastLeftPositionUpdate(data.timestamp);
    console.log('Setting new left arm timestamp:', data.timestamp);

    setPositionDataLive(true);
    console.log('Marked position data as live (actively receiving data)');
    console.log('=== END UPDATING LEFT ARM UI STATE ===');
  };

  // Parse leader arm data format and convert to RobotArmPosition for both arms
  const parseLeaderArmData = (leaderData: LeaderArmData): { right: RobotArmPosition; left: RobotArmPosition | null } => {
    console.log('=== PARSING LEADER DATA ===');
    console.log('Input leaderData:', leaderData);

    // Check if leader_arm_positions exists
    if (!leaderData.leader_arm_positions) {
      console.error('Missing leader_arm_positions in data');
      throw new Error('Missing leader_arm_positions in data');
    }

    const result: { right: RobotArmPosition; left: RobotArmPosition | null } = {
      right: null as any,
      left: null
    };

    // Parse right arm data
    if (leaderData.leader_arm_positions.right) {
      const rightArmPositions = leaderData.leader_arm_positions.right;
      console.log('Right arm positions array:', rightArmPositions);
      console.log('Right arm array length:', rightArmPositions.length);
      console.log('Right arm array values:', rightArmPositions.map((val, idx) => `[${idx}]: ${val}`));

      // Ensure we have exactly 6 joint angles for right arm
      if (rightArmPositions.length !== 6) {
        console.error(`Expected 6 joint angles for right arm, got ${rightArmPositions.length}`);
        throw new Error(`Expected 6 joint angles for right arm, got ${rightArmPositions.length}`);
      }

      // Map array indices to joint names for right arm
      const rightMappedJoints = {
        base: rightArmPositions[0],      // J1 - Base rotation
        shoulder: rightArmPositions[1],  // J2 - Shoulder pitch
        elbow: rightArmPositions[2],     // J3 - Elbow pitch
        wrist1: rightArmPositions[3],    // J4 - Wrist roll
        wrist2: rightArmPositions[4],    // J5 - Wrist pitch
        wrist3: rightArmPositions[5]     // J6 - Wrist yaw
      };

      console.log('Mapped right arm joint angles:');
      Object.entries(rightMappedJoints).forEach(([joint, angle]) => {
        console.log(`  right ${joint}: ${angle}°`);
      });

      result.right = {
        timestamp: Date.now(),
        jointAngles: rightMappedJoints,
        // Set all joints as active since we're receiving live data
        status: {
          base: 'active',
          shoulder: 'active',
          elbow: 'active',
          wrist1: 'active',
          wrist2: 'active',
          wrist3: 'active'
        }
      };
    }

    // Parse left arm data
    if (leaderData.leader_arm_positions.left) {
      const leftArmPositions = leaderData.leader_arm_positions.left;
      console.log('Left arm positions array:', leftArmPositions);
      console.log('Left arm array length:', leftArmPositions.length);
      console.log('Left arm array values:', leftArmPositions.map((val, idx) => `[${idx}]: ${val}`));

      // Ensure we have exactly 6 joint angles for left arm
      if (leftArmPositions.length !== 6) {
        console.error(`Expected 6 joint angles for left arm, got ${leftArmPositions.length}`);
        throw new Error(`Expected 6 joint angles for left arm, got ${leftArmPositions.length}`);
      }

      // Map array indices to joint names for left arm
      const leftMappedJoints = {
        base: leftArmPositions[0],      // J1 - Base rotation
        shoulder: leftArmPositions[1],  // J2 - Shoulder pitch
        elbow: leftArmPositions[2],     // J3 - Elbow pitch
        wrist1: leftArmPositions[3],    // J4 - Wrist roll
        wrist2: leftArmPositions[4],    // J5 - Wrist pitch
        wrist3: leftArmPositions[5]     // J6 - Wrist yaw
      };

      console.log('Mapped left arm joint angles:');
      Object.entries(leftMappedJoints).forEach(([joint, angle]) => {
        console.log(`  left ${joint}: ${angle}°`);
      });

      result.left = {
        timestamp: Date.now(),
        jointAngles: leftMappedJoints,
        // Set all joints as active since we're receiving live data
        status: {
          base: 'active',
          shoulder: 'active',
          elbow: 'active',
          wrist1: 'active',
          wrist2: 'active',
          wrist3: 'active'
        }
      };
    }

    console.log('Final RobotArmPosition result:', result);
    console.log('=== END PARSING LEADER DATA ===');

    return result;
  };

  useEffect(() => {
    const roomInstance = new Room();
    setRoom(roomInstance);

    const connectToRoom = async () => {
      try {
        setConnectionError(null);
        setIsLoading(true);

        // Fetch token and server URL from API
        const response = await fetch('/api/video-token');
        if (!response.ok) {
          throw new Error('Failed to fetch LiveKit credentials');
        }

        const { token, serverUrl, identity, roomName } = await response.json();
        console.log('Fetched credentials:', { serverUrl, identity, roomName });

        if (!token || !serverUrl) {
          throw new Error('Invalid LiveKit credentials');
        }

        setParticipantIdentity(identity);

        // Set up event listeners before connecting
        roomInstance.on(RoomEvent.Connected, () => {
          console.log('LiveKit room connected successfully');
          console.log('Connected participants:', roomInstance.participants.size);
          console.log('Room name:', roomInstance.name);
          console.log('Local participant identity:', roomInstance.localParticipant?.identity);
          setRemoteParticipants(Array.from(roomInstance.participants.values()));
          setIsConnected(true);
          setIsLoading(false);
        });

        // Debug: Log all room events
        roomInstance.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log('Participant connected:', participant.identity);
          console.log('Total participants now:', roomInstance.participants.size + 1);
          setRemoteParticipants(Array.from(roomInstance.participants.values()));
        });

        roomInstance.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log('Participant disconnected:', participant.identity);
          setRemoteParticipants(Array.from(roomInstance.participants.values()));
          // Clear tracks when specific participants disconnect
          if (participant.identity === 'robot-stereo') {
            setRobotCamVideoTrack(null);
          } else if (participant.identity === 'robot-arm-left') {
            setRobotLeftArmCamVideoTrack(null);
          } else if (participant.identity === 'robot-arm-right') {
            setRobotRightArmCamVideoTrack(null);
          }

          // Mark position data as not live if robot controller disconnects
          if (participant.identity === 'robot_controller') {
            setPositionDataLive(false);
            // Also mark left arm status as offline
            setLeftJointStatus({
              base: 'offline',
              shoulder: 'offline',
              elbow: 'offline',
              wrist1: 'offline',
              wrist2: 'offline',
              wrist3: 'offline'
            });
          }
        });

        roomInstance.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant) => {
          console.log('Track subscribed:', track.kind, 'from', participant.identity);
          if (track.kind === Track.Kind.Video) {
            if (participant.identity === 'robot-stereo') {
              setRobotCamVideoTrack(track);
            } else if (participant.identity === 'robot-arm-left') {
              setRobotLeftArmCamVideoTrack(track);
            } else if (participant.identity === 'robot-arm-right') {
              setRobotRightArmCamVideoTrack(track);
            }
          } else if (track.kind === Track.Kind.Audio) {
            setAudioTrack(track);
          }
        });

        roomInstance.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant) => {
          console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
          if (track.kind === Track.Kind.Video) {
            if (participant.identity === 'robot-stereo') {
              setRobotCamVideoTrack(null);
              track.detach();
            } else if (participant.identity === 'robot-arm-left') {
              setRobotLeftArmCamVideoTrack(null);
              track.detach();
            } else if (participant.identity === 'robot-arm-right') {
              setRobotRightArmCamVideoTrack(null);
              track.detach();
            }
          } else if (track.kind === Track.Kind.Audio) {
            setAudioTrack(null);
            track.detach();
          }
        });

        roomInstance.on(RoomEvent.Disconnected, () => {
          console.log('Disconnected from room');
          setIsConnected(false);
          setRobotCamVideoTrack(null);
          setRobotLeftArmCamVideoTrack(null);
          setRobotRightArmCamVideoTrack(null);
          setAudioTrack(null);
          setRemoteParticipants([]);
          setPositionDataLive(false);
        });

        roomInstance.on(RoomEvent.TrackPublished, (publication, participant) => {
          console.log('Track published:', publication.kind, 'by', participant.identity);
        });

        // Additional debugging for data events
        console.log('Setting up DataReceived event listener...');

        // Handle incoming data messages for robot arm positions
        roomInstance.on(RoomEvent.DataReceived, (payload: Uint8Array, participant, kind, topic) => {
          if (topic === 'teleop_action') {
            const decoder = new TextDecoder();
            const data = decoder.decode(payload);

            try {
              const json = JSON.parse(data) as Record<string, unknown>;
              const parseJointValue = (key: string) => {
                const value = json[key];
                if (typeof value === 'number') {
                  return Number.isFinite(value) ? value : null;
                }
                if (typeof value === 'string') {
                  const parsed = parseFloat(value);
                  return Number.isFinite(parsed) ? parsed : null;
                }
                return null;
              };

              setJointAngles(prev => ({
                base: parseJointValue('right_shoulder_pan.pos') ?? prev.base,
                shoulder: parseJointValue('right_shoulder_lift.pos') ?? prev.shoulder,
                elbow: parseJointValue('right_elbow.pos') ?? prev.elbow,
                wrist1: parseJointValue('right_wrist_pitch.pos') ?? prev.wrist1,
                wrist2: parseJointValue('right_wrist_roll.pos') ?? prev.wrist2,
                wrist3: parseJointValue('right_gripper.pos') ?? prev.wrist3,
              }));

              const now = Date.now();
              setLastLeftPositionUpdate(now);
              setLastPositionUpdate(now);
              if (!positionDataLive) {
                setPositionDataLive(true);
              }
            } catch (err) {
              console.error('Failed to parse teleop command data', err, data);
            }

            return;
          }

          try {
            const decoder = new TextDecoder();
            const jsonString = decoder.decode(payload);
            const parsedData = JSON.parse(jsonString) as Record<string, unknown>;
            const leaderPayload = parsedData as LeaderArmData;

            if (topic === 'leader' && leaderPayload.leader_arm_positions) {
              const positionData = parseLeaderArmData(leaderPayload);
              handleRobotArmPositionData(positionData.right);
              if (positionData.left) {
                handleLeftRobotArmPositionData(positionData.left);
              }
              return;
            }

            if ('leader_arm_positions' in parsedData && leaderPayload.leader_arm_positions) {
              const positionData = parseLeaderArmData(leaderPayload);
              handleRobotArmPositionData(positionData.right);
              if (positionData.left) {
                handleLeftRobotArmPositionData(positionData.left);
              }
            }
          } catch (error) {
            console.error('Error processing data received event:', error);
          }
        });

        // Connect to the room
        console.log('Attempting to connect to LiveKit room...');
        await roomInstance.connect(serverUrl, token);
        console.log('Room connection initiated');

      } catch (error) {
        console.error('Failed to connect to LiveKit room:', error);
        setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        setIsConnected(false);
        setIsLoading(false);
      }
    };

    connectToRoom();

    return () => {
      roomInstance.removeAllListeners();
      if (roomInstance.state !== ConnectionState.Disconnected) {
        roomInstance.disconnect();
      }
    };
  }, []);

  // Helper to normalize joint badge styling against the new palette
  const getJointStatusDisplay = (
    status: 'active' | 'inactive' | 'error' | 'offline',
    isLive: boolean
  ) => {
    if (!isLive) {
      return {
        color: 'border border-warning/40 bg-warning/10 text-warning',
        text: 'Stale',
      };
    }

    switch (status) {
      case 'active':
        return {
          color: 'border border-success/40 bg-success/10 text-success',
          text: 'Active',
        };
      case 'inactive':
        return {
          color: 'border border-white/15 bg-panelSubtle text-fg2',
          text: 'Inactive',
        };
      case 'error':
        return {
          color: 'border border-danger/40 bg-danger/10 text-danger',
          text: 'Error',
        };
      case 'offline':
        return {
          color: 'border border-white/15 bg-panelSubtle text-fg3',
          text: 'Offline',
        };
      default:
        return {
          color: 'border border-white/15 bg-panelSubtle text-fg3',
          text: 'Unknown',
        };
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-bg0 text-fg0">
      <div className="relative z-10 flex w-full">
        {/* Sidebar Navigation */}
        <NavigationSidebar currentPath="/" />

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className="border-b border-white/10 bg-panel/60 px-6 py-6 backdrop-blur-xl lg:px-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="panel-heading">Real-time teleoperation</p>
                <h1 className="mt-2 font-display text-3xl font-semibold text-white lg:text-[2.5rem]">
                  SO-100 Bimanual Command Center
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-fg2">
                  Monitor synchronized video feeds, inertial telemetry, and dual-arm health while
                  LiveKit keeps the operator in lockstep with the robot.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em]">
                <span
                  className={clsx(
                    'rounded-full border px-4 py-2',
                    isConnected
                      ? 'border-success/50 bg-success/10 text-success'
                      : 'border-danger/40 bg-danger/10 text-danger'
                  )}
                >
                  {isConnected ? 'LiveKit Connected' : 'LiveKit Offline'}
                </span>
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            {/* Left Panel - Robot Details */}
            <aside className="w-full border-b border-white/10 bg-panel/40 p-6 backdrop-blur-xl lg:w-80 lg:border-b-0 lg:border-r">
              <div>
                <p className="panel-heading">Robot profile</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-white">SO-100 ARM ×2</h2>
                <p className="mt-2 text-sm text-fg2">
                  Dual 6-DOF manipulators with synchronized grippers for dexterous pick-and-place.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-panelSubtle/80 px-4 py-3">
                    <div className="flex items-center justify-between text-sm text-fg2">
                      <span>LiveKit link</span>
                      <span className={clsx('font-semibold', isConnected ? 'text-success' : 'text-danger')}>
                        {isConnected ? 'Connected' : 'Offline'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-fg3">Room: {room?.name ?? '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-panelSubtle/80 px-4 py-3">
                    <div className="flex items-center justify-between text-sm text-fg2">
                      <span>Identity</span>
                      <span className="font-semibold text-fg1">
                        {participantIdentity || 'requesting token'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-fg3">Participants: {remoteParticipants.length}</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Visualization Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex flex-col gap-6 p-6 pb-4 xl:flex-row">
                {/* Left Column - Video Feeds */}
                <div className="flex w-full flex-col gap-6 xl:w-1/2">
                  <section className="glass-panel flex min-h-[320px] flex-col p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="panel-heading">Stereo camera</p>
                        <h3 className="font-display text-xl font-semibold text-white">Perception feed</h3>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden rounded-2xl bg-black/40">
                      <LiveVideoFeed
                        onVideoElementReady={handleVideoElementReady}
                        room={room}
                        isConnected={isConnected}
                        videoTrack={robotCamVideoTrack}
                        audioTrack={audioTrack}
                        isLoading={isLoading}
                        connectionError={connectionError}
                        participantIdentity={participantIdentity}
                        remoteParticipants={remoteParticipants}
                      />
                    </div>
                  </section>

                  <div className="grid gap-6 md:grid-cols-2">
                    <section className="glass-panel flex min-h-[260px] flex-col p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="panel-heading">Left gripper</p>
                      </div>
                      <div className="relative flex-1 overflow-hidden rounded-2xl bg-black/40">
                        <LiveVideoFeed
                          onVideoElementReady={handleRobotLeftArmVideoElementReady}
                          room={room}
                          isConnected={isConnected}
                          videoTrack={robotLeftArmCamVideoTrack}
                          audioTrack={audioTrack}
                          isLoading={isLoading}
                          connectionError={connectionError}
                          participantIdentity={participantIdentity}
                          remoteParticipants={remoteParticipants}
                        />
                      </div>
                    </section>

                    <section className="glass-panel flex min-h-[260px] flex-col p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="panel-heading">Right gripper</p>
                      </div>
                      <div className="relative flex-1 overflow-hidden rounded-2xl bg-black/40">
                        <LiveVideoFeed
                          onVideoElementReady={handleRobotRightArmVideoElementReady}
                          room={room}
                          isConnected={isConnected}
                          videoTrack={robotRightArmCamVideoTrack}
                          audioTrack={audioTrack}
                          isLoading={isLoading}
                          connectionError={connectionError}
                          participantIdentity={participantIdentity}
                          remoteParticipants={remoteParticipants}
                        />
                      </div>
                    </section>
                  </div>
                </div>

                {/* Right Column - Robot Arm Status and Graph */}
                <div className="flex w-full flex-col gap-6 xl:w-1/2">
                  <section className="glass-panel flex min-h-[320px] flex-col p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="panel-heading">Robot workspace</p>
                        <h3 className="font-display text-xl font-semibold text-white">3D overlay</h3>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden rounded-2xl bg-black/30 min-h-[320px] xl:min-h-[604px]">
                      <div className="absolute inset-0">
                        <RobotArm3DWrapper
                          videoElement={videoElement}
                          robotArmVideoElement={robotArmVideoElement}
                          robotArmVideoTrack={robotRightArmCamVideoTrack}
                          robotLeftArmVideoElement={robotLeftArmVideoElement}
                          robotLeftArmVideoTrack={robotLeftArmCamVideoTrack}
                          jointAngles={jointAngles}
                          leftJointAngles={leftJointAngles}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="glass-panel flex min-h-[320px] flex-col p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="panel-heading">Joint telemetry</p>
                        <p className="text-sm text-fg2">
                          Last update:{' '}
                          {lastPositionUpdate ? new Date(lastPositionUpdate).toLocaleTimeString() : '—'}
                        </p>
                      </div>
                      <span
                        className={clsx(
                          'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]',
                          positionDataLive
                            ? 'border-success/40 text-success'
                            : 'border-warning/40 text-warning'
                        )}
                      >
                        {positionDataLive ? 'Live' : 'Stale'}
                      </span>
                    </div>
                    <div className="relative flex-1">
                      <JointPositionGraph
                        jointAngles={jointAngles}
                        lastPositionUpdate={lastPositionUpdate}
                        className="absolute inset-0"
                      />
                    </div>
                  </section>
                </div>
              </div>

              {/* Module Status Cards */}
              <section className="flex-1 overflow-y-auto px-6 pb-10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 
