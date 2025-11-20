'use client';

import { useEffect, useRef, useState } from 'react';

interface JointAngles {
    base: number | null;
    shoulder: number | null;
    elbow: number | null;
    wrist1: number | null;
    wrist2: number | null;
    wrist3: number | null;
}

interface JointDataPoint {
    timestamp: number;
    angles: JointAngles;
}

// Joint limits mapped to the graph joint keys
const JOINT_LIMITS = {
    base: { min: -2, max: 2 },             // shoulder_pan
    shoulder: { min: -0.279, max: 3.316 }, // shoulder_lift
    elbow: { min: -0.209, max: 3.14159 },  // elbow_flex
    wrist1: { min: -1.745, max: 1.745 },   // wrist_pitch
    wrist2: { min: -3.14158, max: 3.14158 }, // wrist_roll
    wrist3: { min: -0.2, max: 2.0 },       // gripper
} as const;

interface JointPositionGraphProps {
    jointAngles: JointAngles;
    lastPositionUpdate: number | null;
    className?: string;
}

const JOINT_COLORS = {
    base: '#00ff88',      // Bright green
    shoulder: '#ff0088',  // Bright pink
    elbow: '#0088ff',     // Bright blue
    wrist1: '#ffaa00',    // Bright orange
    wrist2: '#aa00ff',    // Bright purple
    wrist3: '#88ff00',    // Bright lime
};

const JOINT_NAMES = {
    base: 'J1',
    shoulder: 'J2',
    elbow: 'J3',
    wrist1: 'J4',
    wrist2: 'J5',
    wrist3: 'J6',
};

export function JointPositionGraph({ jointAngles, lastPositionUpdate, className = '' }: JointPositionGraphProps) {
    const [dataPoints, setDataPoints] = useState<JointDataPoint[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [showTestData, setShowTestData] = useState(false);

    const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);
    const radiansToDegrees = (radians: number) => radians * (180 / Math.PI);
    const normalizedToRadians = (normalized: number, jointKey: keyof JointAngles): number => {
        const limits = JOINT_LIMITS[jointKey];
        const clamped = Math.max(-100, Math.min(100, normalized));
        return limits.min + ((clamped + 100) / 200) * (limits.max - limits.min);
    };

    // Add debugging
    useEffect(() => {
        console.log('=== JOINT POSITION GRAPH DEBUG ===');
        console.log('Joint angles:', jointAngles);
        console.log('Last position update:', lastPositionUpdate);
        console.log('Data points count:', dataPoints.length);
        console.log('Dimensions:', dimensions);
        console.log('Show test data:', showTestData);
        console.log('Container ref current:', containerRef.current);
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            console.log('Container rect:', rect);
        }
        console.log('==================================');
    }, [jointAngles, lastPositionUpdate, dataPoints.length, dimensions, showTestData]);

    // Update dimensions when component mounts or resizes
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                console.log('Updating dimensions from rect:', rect);
                // Ensure we have valid dimensions
                const newWidth = Math.max(rect.width, 100);
                const newHeight = Math.max(rect.height, 50);
                setDimensions({ width: newWidth, height: newHeight });
                console.log('Graph dimensions updated:', { width: newWidth, height: newHeight });
            } else {
                console.log('Container ref is null, cannot update dimensions');
            }
        };

        // Use setTimeout to ensure the DOM is ready
        const timer = setTimeout(updateDimensions, 100);
        updateDimensions();

        window.addEventListener('resize', updateDimensions);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateDimensions);
        };
    }, []);

    // Test data generation after 5 seconds of no real data
    useEffect(() => {
        const timer = setTimeout(() => {
            if (dataPoints.length === 0) {
                console.log('No real data received, enabling test mode');
                setShowTestData(true);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [dataPoints.length]);

    // Generate test data
    useEffect(() => {
        if (showTestData) {
            const generateTestData = () => {
                const now = Date.now();
                const testPoint: JointDataPoint = {
                    timestamp: now,
                    angles: {
                        base: degreesToRadians(30 + Math.sin(now / 1000) * 20),
                        shoulder: degreesToRadians(45 + Math.cos(now / 1500) * 15),
                        elbow: degreesToRadians(60 + Math.sin(now / 800) * 25),
                        wrist1: degreesToRadians(20 + Math.cos(now / 1200) * 10),
                        wrist2: degreesToRadians(35 + Math.sin(now / 2000) * 30),
                        wrist3: degreesToRadians(50 + Math.cos(now / 1800) * 20),
                    }
                };

                setDataPoints(prevPoints => {
                    const updatedPoints = [...prevPoints, testPoint];
                    const thirtySecondsAgo = Date.now() - 30000;
                    return updatedPoints.filter(point => point.timestamp >= thirtySecondsAgo);
                });
            };

            const interval = setInterval(generateTestData, 100); // 10 FPS
            return () => clearInterval(interval);
        }
    }, [showTestData]);

    // Add new data points and maintain 30-second sliding window
    useEffect(() => {
        if (lastPositionUpdate && Object.values(jointAngles).some(angle => angle !== null)) {
            console.log('Adding new data point to graph');
            const convertedAngles: JointAngles = {
                base: jointAngles.base !== null ? normalizedToRadians(jointAngles.base, 'base') : null,
                shoulder: jointAngles.shoulder !== null ? normalizedToRadians(jointAngles.shoulder, 'shoulder') : null,
                elbow: jointAngles.elbow !== null ? normalizedToRadians(jointAngles.elbow, 'elbow') : null,
                wrist1: jointAngles.wrist1 !== null ? normalizedToRadians(jointAngles.wrist1, 'wrist1') : null,
                wrist2: jointAngles.wrist2 !== null ? normalizedToRadians(jointAngles.wrist2, 'wrist2') : null,
                wrist3: jointAngles.wrist3 !== null ? normalizedToRadians(jointAngles.wrist3, 'wrist3') : null,
            };
            const newDataPoint: JointDataPoint = {
                timestamp: lastPositionUpdate,
                angles: convertedAngles
            };

            setDataPoints(prevPoints => {
                const updatedPoints = [...prevPoints, newDataPoint];
                const thirtySecondsAgo = Date.now() - 30000;

                // Keep only points from the last 30 seconds
                const filteredPoints = updatedPoints.filter(point => point.timestamp >= thirtySecondsAgo);
                console.log('Updated data points count:', filteredPoints.length);
                return filteredPoints;
            });
        }
    }, [jointAngles, lastPositionUpdate]);

    // Clean up old data points periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const thirtySecondsAgo = Date.now() - 30000;
            setDataPoints(prevPoints =>
                prevPoints.filter(point => point.timestamp >= thirtySecondsAgo)
            );
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Show loading state only if dimensions are truly not available
    if (dimensions.width < 10 || dimensions.height < 10) {
        // Still loading dimensions
        return (
            <div ref={containerRef} className={`absolute inset-0 pointer-events-none ${className}`}>
                <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-black/50">
                    <div className="rounded-xl bg-black/70 px-3 py-2 font-mono text-xs text-fg1">
                        Loading graph... ({dimensions.width}x{dimensions.height})
                    </div>
                </div>
            </div>
        );
    }

    // Show placeholder when no data
    if (dataPoints.length === 0) {
        return (
            <div ref={containerRef} className={`absolute inset-0 pointer-events-none ${className}`}>
                <svg
                    className="h-full w-full"
                    style={{ background: 'rgba(3, 8, 23, 0.65)' }}
                >
                    {/* Grid pattern to show the graph area */}
                    <defs>
                        <pattern id="placeholder-grid" width="40" height="30" patternUnits="userSpaceOnUse">
                            <path
                                d="M 40 0 L 0 0 0 30"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.08)"
                                strokeWidth="1"
                            />
                        </pattern>
                    </defs>

                    <rect
                        x="20"
                        y="20"
                        width={dimensions.width - 40}
                        height={dimensions.height - 40}
                        fill="url(#placeholder-grid)"
                        stroke="rgba(255, 255, 255, 0.12)"
                        strokeWidth="1"
                        rx="4"
                    />

                    {/* Placeholder text */}
                    <text
                        x={dimensions.width / 2}
                        y={dimensions.height / 2 - 10}
                        textAnchor="middle"
                        className="fill-white font-mono text-sm"
                        style={{ fontSize: '14px' }}
                    >
                        Waiting for joint position data...
                    </text>

                    <text
                        x={dimensions.width / 2}
                        y={dimensions.height / 2 + 10}
                        textAnchor="middle"
                        className="fill-white font-mono text-xs opacity-60"
                        style={{ fontSize: '12px' }}
                    >
                        Test mode will activate in 5s if no data received
                    </text>
                </svg>
            </div>
        );
    }

    const padding = 20;
    const graphWidth = dimensions.width - (padding * 2);
    const graphHeight = dimensions.height - (padding * 2);

    // Calculate time range (last 30 seconds)
    const now = Date.now();
    const thirtySecondsAgo = now - 30000;

    // Find angle range for scaling
    const allAngles = dataPoints.flatMap(point =>
        (Object.values(point.angles)
            .filter(angle => angle !== null)
            .map(angle => radiansToDegrees(angle!))) as number[]
    );

    if (allAngles.length === 0) {
        console.log('No valid angles found in data points');
        return (
            <div className={`absolute inset-0 pointer-events-none ${className}`}>
                <div className="w-full h-full flex items-center justify-center">
                    <div className="text-white text-sm font-mono bg-black bg-opacity-30 px-3 py-2 rounded">
                        No valid angle data
                    </div>
                </div>
            </div>
        );
    }

    // Fixed angle range from -180 to +180 degrees
    const scaleMinAngle = -180;
    const scaleMaxAngle = 180;
    const scaleAngleRange = scaleMaxAngle - scaleMinAngle; // 360 degrees

    console.log('Rendering graph with fixed angle range: -180 to +180 degrees');

    // Helper functions for coordinate conversion
    const timeToX = (timestamp: number) => {
        const normalizedTime = (timestamp - thirtySecondsAgo) / 30000;
        return padding + (normalizedTime * graphWidth);
    };

    const angleToY = (angleRadians: number) => {
        const angle = radiansToDegrees(angleRadians);
        const normalizedAngle = (angle - scaleMinAngle) / scaleAngleRange;
        return padding + graphHeight - (normalizedAngle * graphHeight);
    };

    // Generate path data for each joint
    const generatePathData = (jointKey: keyof JointAngles) => {
        const validPoints = dataPoints.filter(point => point.angles[jointKey] !== null);
        if (validPoints.length < 2) return '';

        let pathData = '';
        validPoints.forEach((point, index) => {
            const x = timeToX(point.timestamp);
            const y = angleToY(point.angles[jointKey]!);

            if (index === 0) {
                pathData += `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        });

        return pathData;
    };

    return (
        <div ref={containerRef} className={`absolute inset-0 pointer-events-none ${className}`}>
            <svg
                className="h-full w-full"
                style={{ background: 'rgba(3, 7, 23, 0.75)' }}
            >
                {/* Grid lines */}
                <defs>
                    <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                        <path
                            d="M 40 0 L 0 0 0 30"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.12)"
                            strokeWidth="1"
                        />
                    </pattern>
                </defs>

                <rect
                    x={padding}
                    y={padding}
                    width={graphWidth}
                    height={graphHeight}
                    fill="url(#grid)"
                />

                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const angle = scaleMinAngle + (ratio * scaleAngleRange);
                    const y = padding + graphHeight - (ratio * graphHeight);

                    return (
                        <g key={ratio}>
                            <line
                                x1={padding}
                                y1={y}
                                x2={padding + graphWidth}
                                y2={y}
                                stroke="rgba(255, 255, 255, 0.12)"
                                strokeWidth="1"
                            />
                            <text
                                x={padding + 15}
                                y={y + 4}
                                textAnchor="start"
                                className="text-xs fill-white font-mono"
                                style={{ fontSize: '10px' }}
                            >
                                {angle.toFixed(0)}°
                            </text>
                        </g>
                    );
                })}

                {/* X-axis labels (time) */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const timestamp = thirtySecondsAgo + (ratio * 30000);
                    const x = padding + (ratio * graphWidth);
                    const secondsAgo = Math.round((now - timestamp) / 1000);

                    return (
                        <g key={ratio}>
                            <line
                                x1={x}
                                y1={padding}
                                x2={x}
                                y2={padding + graphHeight}
                                stroke="rgba(255, 255, 255, 0.12)"
                                strokeWidth="1"
                            />
                            <text
                                x={x}
                                y={padding + graphHeight + 15}
                                textAnchor="middle"
                                className="text-xs fill-white font-mono"
                                style={{ fontSize: '10px' }}
                            >
                                -{secondsAgo}s
                            </text>
                        </g>
                    );
                })}

                {/* Joint angle lines */}
                {Object.entries(JOINT_COLORS).map(([jointKey, color]) => {
                    const pathData = generatePathData(jointKey as keyof JointAngles);
                    if (!pathData) return null;

                    return (
                        <g key={jointKey}>
                            {/* Glow effect */}
                            <path
                                d={pathData}
                                fill="none"
                                stroke={color}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity="0.3"
                                filter="blur(2px)"
                            />
                            {/* Main line */}
                            <path
                                d={pathData}
                                fill="none"
                                stroke={color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity="0.9"
                            >
                                <animate
                                    attributeName="stroke-dasharray"
                                    values="0 1000;1000 0"
                                    dur="0.5s"
                                    fill="freeze"
                                />
                            </path>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
} 
