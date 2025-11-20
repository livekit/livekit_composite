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
import { Room, RoomEvent, RemoteTrack, Track, ConnectionState, RemoteParticipant, DataPacket_Kind } from 'livekit-client';
import Image from "next/image";
import Link from "next/link";
import { LidarViewer } from "@/components/lidar-viewer";
import { LivoxDecoder } from "@/lib/lidar-decoder";
import { NavigationSidebar } from "@/components/navigation-sidebar";

export default function LidarPage() {
    // LiveKit room state
    const [room, setRoom] = useState<Room | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [participantIdentity, setParticipantIdentity] = useState<string>('');

    // Lidar data state
    const [lidarData, setLidarData] = useState<any>(null);
    const [lastLidarUpdate, setLastLidarUpdate] = useState<number | null>(null);
    const [lidarDataLive, setLidarDataLive] = useState(false);

    // Packet tracking state for logging and validation
    const [packetStats, setPacketStats] = useState({
        totalPackets: 0,
        lastPacketTime: null as number | null,
        lastLivoxTimestamp: null as number | null,
        packetsPerSecond: 0,
        missedPackets: 0,
        avgTimeBetweenPackets: 0,
        minTimeBetweenPackets: Infinity,
        maxTimeBetweenPackets: 0
    });

    useEffect(() => {
        const roomInstance = new Room();
        setRoom(roomInstance);

        const connectToRoom = async () => {
            try {
                setConnectionError(null);
                setIsLoading(true);

                // Fetch token and server URL from API
                const response = await fetch('/api/lidar-token');
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
                    setIsConnected(true);
                    setIsLoading(false);
                });

                roomInstance.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
                    console.log('Participant connected:', participant.identity);
                });

                roomInstance.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
                    console.log('Participant disconnected:', participant.identity);
                    if (participant.identity === 'lidar_sensor') {
                        setLidarDataLive(false);
                    }
                });

                roomInstance.on(RoomEvent.Disconnected, () => {
                    console.log('Disconnected from room');
                    setIsConnected(false);
                    setLidarDataLive(false);
                });

                // Handle incoming lidar data
                roomInstance.on(RoomEvent.DataReceived, (payload: Uint8Array, participant, kind, topic) => {
                    console.log('Data received:', { participant: participant?.identity, topic, kind });

                    if (topic === 'lidar') {
                        try {
                            // Convert Uint8Array payload to ArrayBuffer for the lidar decoder
                            const dataBuffer = payload.buffer.slice(
                                payload.byteOffset,
                                payload.byteOffset + payload.byteLength
                            ) as ArrayBuffer;

                            // Use the lidar decoder to parse the binary data directly
                            const parsedPacket = LivoxDecoder.decodePacket(dataBuffer);

                            if (parsedPacket) {
                                const now = Date.now();
                                const livoxTimestamp = parsedPacket.timestamp;

                                // Use local variables to track current packet for accurate logging
                                let currentPacketCount = packetStats.totalPackets + 1;
                                let currentMissedPackets = packetStats.missedPackets;
                                let timeBetweenPackets = 0;
                                let estimatedMissedThisTime = 0;

                                // Calculate time between packets
                                if (packetStats.lastPacketTime) {
                                    timeBetweenPackets = now - packetStats.lastPacketTime;
                                }

                                // Detect missed packets based on Livox timestamp
                                if (packetStats.lastLivoxTimestamp && livoxTimestamp) {
                                    const timestampDiff = livoxTimestamp - packetStats.lastLivoxTimestamp;
                                    // Based on manual: data latency ≤2ms, expect packets every ~2-10ms typically
                                    // If timestamp gap > 50ms, likely missed packets
                                    if (timestampDiff > 50) { // 50ms in milliseconds (timestamps appear to be in ms, not μs)
                                        estimatedMissedThisTime = Math.floor(timestampDiff / 10) - 1; // Assuming ~10ms per packet
                                        currentMissedPackets += estimatedMissedThisTime;
                                        console.warn(`🔴 MISSED PACKETS DETECTED:`, {
                                            estimatedMissed: estimatedMissedThisTime,
                                            timestampGap: `${timestampDiff.toFixed(2)}ms`,
                                            lastTimestamp: packetStats.lastLivoxTimestamp,
                                            currentTimestamp: livoxTimestamp,
                                            packetNumber: currentPacketCount
                                        });
                                    }
                                }

                                // Log individual packet details with expanded view
                                console.group(`📦 Lidar Packet #${currentPacketCount}`);
                                console.log('📋 Packet Details:', {
                                    points: parsedPacket.points.length,
                                    dataType: parsedPacket.dataType,
                                    livoxTimestamp: livoxTimestamp,
                                    livoxTimestampMs: livoxTimestamp,
                                    receiveTime: new Date(now).toISOString(),
                                });

                                console.log('⏱️ Timing Analysis:', {
                                    timeSinceLastPacket: packetStats.lastPacketTime ? `${timeBetweenPackets}ms` : 'N/A',
                                    expectedInterval: '~10ms (based on typical lidar rates)',
                                    isDelayed: timeBetweenPackets > 20 ? '⚠️ YES' : '✅ NO',
                                    packetSequenceStatus: currentPacketCount <= 5 ? '🟡 EARLY PACKETS - Building baseline' : '🟢 NORMAL OPERATION',
                                    timestampProgression: packetStats.lastLivoxTimestamp
                                        ? `${packetStats.lastLivoxTimestamp.toFixed(2)} → ${livoxTimestamp.toFixed(2)} (Δ${(livoxTimestamp - packetStats.lastLivoxTimestamp).toFixed(2)}ms)`
                                        : `${livoxTimestamp.toFixed(2)} (first timestamp)`,
                                });

                                // Special debugging for first 10 packets
                                if (currentPacketCount <= 10) {
                                    console.log('🔬 Early Packet Debug Info:', {
                                        packetNumber: currentPacketCount,
                                        rawTimestamp: livoxTimestamp,
                                        previousTimestamp: packetStats.lastLivoxTimestamp || 'none',
                                        currentPacketTime: now,
                                        previousPacketTime: packetStats.lastPacketTime || 'none',
                                        networkDelay: timeBetweenPackets,
                                        lidarTimestampGap: packetStats.lastLivoxTimestamp
                                            ? (livoxTimestamp - packetStats.lastLivoxTimestamp).toFixed(2) + 'ms'
                                            : 'N/A (first packet)',
                                        expectation: 'Building timing baseline - stats will be more accurate after packet #10'
                                    });
                                }

                                console.log('📊 Session Stats:', {
                                    totalPacketsReceived: currentPacketCount,
                                    totalMissedPackets: currentMissedPackets,
                                    missedThisTime: estimatedMissedThisTime,
                                    packetLossRate: currentPacketCount > 0
                                        ? `${((currentMissedPackets / (currentPacketCount + currentMissedPackets)) * 100).toFixed(2)}%`
                                        : '0%',
                                    avgTimeBetweenPackets: packetStats.avgTimeBetweenPackets > 0
                                        ? `${packetStats.avgTimeBetweenPackets.toFixed(1)}ms`
                                        : (currentPacketCount === 1 ? 'First packet - no average yet' : 'calculating...'),
                                    currentInterval: timeBetweenPackets > 0 ? `${timeBetweenPackets}ms` : 'N/A',
                                    minMaxInterval: packetStats.minTimeBetweenPackets !== Infinity
                                        ? `${packetStats.minTimeBetweenPackets}ms - ${packetStats.maxTimeBetweenPackets}ms`
                                        : 'Not enough data yet',
                                    packetsPerSecond: packetStats.packetsPerSecond > 0
                                        ? `${packetStats.packetsPerSecond}/s`
                                        : (currentPacketCount < 10 ? `Need ${10 - currentPacketCount} more packets to calculate` : 'calculating...')
                                });

                                console.log('🔍 Livox Horizon Manual Compliance:', {
                                    expectedPointRate: '240k points/s (single) or 480k points/s (dual)',
                                    maxDataLatency: '≤2ms (per manual)',
                                    currentPointsInPacket: parsedPacket.points.length,
                                    dataLatencyOk: timeBetweenPackets <= 10 ? '✅ GOOD' : '⚠️ HIGH',
                                    packetIntegrityOk: parsedPacket.points.length > 0 ? '✅ GOOD' : '❌ NO POINTS',
                                });
                                console.groupEnd();

                                // Update packet statistics and detect missing packets
                                setPacketStats(prev => {
                                    const newStats = { ...prev };
                                    newStats.totalPackets = currentPacketCount;
                                    newStats.missedPackets = currentMissedPackets;

                                    // Calculate time between packets (in ms)
                                    if (prev.lastPacketTime) {
                                        newStats.minTimeBetweenPackets = Math.min(prev.minTimeBetweenPackets, timeBetweenPackets);
                                        newStats.maxTimeBetweenPackets = Math.max(prev.maxTimeBetweenPackets, timeBetweenPackets);

                                        // Calculate running average
                                        const alpha = 0.1; // Smoothing factor
                                        newStats.avgTimeBetweenPackets = prev.avgTimeBetweenPackets === 0
                                            ? timeBetweenPackets
                                            : (alpha * timeBetweenPackets) + ((1 - alpha) * prev.avgTimeBetweenPackets);
                                    }

                                    // Calculate packets per second (based on last 10 packets)
                                    if (newStats.totalPackets % 10 === 0 && prev.lastPacketTime) {
                                        const timeSpan = now - prev.lastPacketTime;
                                        newStats.packetsPerSecond = timeSpan > 0 ? Math.round(10000 / timeSpan) : 0;
                                    }

                                    newStats.lastPacketTime = now;
                                    newStats.lastLivoxTimestamp = livoxTimestamp;

                                    return newStats;
                                });

                                // Log every 25 packets with summary stats
                                if (currentPacketCount % 25 === 0) {
                                    console.group(`📊 PACKET SUMMARY - ${currentPacketCount} packets received`);
                                    console.log('🎯 Performance Metrics:', {
                                        totalReceived: currentPacketCount,
                                        totalMissed: currentMissedPackets,
                                        currentRate: `${packetStats.packetsPerSecond || 'calculating...'} packets/s`,
                                        avgInterval: `${packetStats.avgTimeBetweenPackets.toFixed(1)}ms`,
                                        rangeInterval: packetStats.minTimeBetweenPackets !== Infinity
                                            ? `${packetStats.minTimeBetweenPackets}ms - ${packetStats.maxTimeBetweenPackets}ms`
                                            : 'calculating...',
                                        reliabilityScore: `${(100 - (currentMissedPackets / (currentPacketCount + currentMissedPackets)) * 100).toFixed(1)}%`,
                                    });

                                    console.log('✅ Livox Horizon Compliance Check:', {
                                        dataLatencyOk: packetStats.avgTimeBetweenPackets <= 10 ? '✅ PASS' : '❌ FAIL',
                                        packetRateOk: packetStats.packetsPerSecond >= 50 ? '✅ PASS' : '❌ FAIL',
                                        reliability: currentMissedPackets < 5 ? '✅ GOOD' : '⚠️ NEEDS ATTENTION',
                                        overallHealth: (currentMissedPackets < 5 && packetStats.avgTimeBetweenPackets <= 10) ? '💚 HEALTHY' : '⚠️ CHECK SYSTEM'
                                    });
                                    console.groupEnd();
                                }

                                setLidarData(parsedPacket);
                                setLastLidarUpdate(Date.now());
                                setLidarDataLive(true);
                                console.log('Lidar data decoded:', {
                                    points: parsedPacket.points.length,
                                    dataType: parsedPacket.dataType,
                                    timestamp: parsedPacket.timestamp
                                });
                            } else {
                                console.warn('Failed to decode lidar packet');
                            }
                        } catch (error) {
                            console.error('Error processing lidar data:', error);
                        }
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
            console.log('Cleaning up room connection');
            roomInstance.disconnect();
        };
    }, []);

    // Check for stale lidar data
    useEffect(() => {
        const interval = setInterval(() => {
            if (lastLidarUpdate && Date.now() - lastLidarUpdate > 5000) {
                setLidarDataLive(false);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lastLidarUpdate]);

    return (
        <div className="h-screen bg-white text-gray-900 flex overflow-hidden">
            {/* Sidebar Navigation */}
            <NavigationSidebar currentPath="/lidar" />

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4 bg-white">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            LIDAR Streaming Visualization
                        </h1>
                    </div>
                </div>

                <div className="flex-1 flex">
                    {/* Left Panel - Sensor Details */}
                    <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Sensor</p>
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Livox Horizon</h2>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">LiveKit connection:</span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {isConnected ? 'Connected' : 'Offline'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Point cloud data:</span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${lidarDataLive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {lidarDataLive ? 'Live' : 'Offline'}
                                        </span>
                                    </div>
                                    {lastLidarUpdate && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Last update:</span>
                                            <span className="text-gray-900 font-medium">
                                                {new Date(lastLidarUpdate).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Scan Parameters</p>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Range:</span>
                                        <span className="text-gray-900 font-medium">100m</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Field of view:</span>
                                        <span className="text-gray-900 font-medium">81.7°/25.1°</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Visualization Area - Full Width Three.js Viewer */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 bg-white p-4">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col">
                                <div className="mb-2 flex-shrink-0">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                        Point Cloud Visualization
                                    </p>
                                </div>
                                <div className="flex-1 rounded-lg overflow-hidden relative bg-gray-50">
                                    <LidarViewer
                                        lidarData={lidarData}
                                        isConnected={isConnected}
                                        isLoading={isLoading}
                                        connectionError={connectionError}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 