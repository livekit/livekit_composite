'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { LivoxDecoder, LidarPoint, LidarPacket, PointCloudProcessor } from '@/lib/lidar-decoder';

interface LidarViewerProps {
    lidarData: any;
    isConnected: boolean;
    isLoading: boolean;
    connectionError: string | null;
}

interface TimestampedPoint extends LidarPoint {
    timestamp: number;
}

export function LidarViewer({
    lidarData,
    isConnected,
    isLoading,
    connectionError
}: LidarViewerProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const pointCloudRef = useRef<THREE.Points | null>(null);
    const pointsBufferRef = useRef<THREE.BufferGeometry | null>(null);

    // Store accumulated points with timestamps
    const accumulatedPointsRef = useRef<TimestampedPoint[]>([]);

    const [accumulationTime, setAccumulationTime] = useState(3); // Default 3 seconds

    const [pointStats, setPointStats] = useState({
        totalPoints: 0,
        totalPointsParsed: 0,
        dataType: 'Unknown',
        lastUpdate: 0,
        packetsReceived: 0
    });

    // Initialize Three.js scene
    useEffect(() => {
        if (!mountRef.current) return;

        const mount = mountRef.current;
        const width = mount.clientWidth;
        const height = mount.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;

        mount.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        // Grid helper - 5m extent (10x10 total)
        const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x444444);
        scene.add(gridHelper);

        // Custom thick axes with labels
        const createAxis = (direction: THREE.Vector3, color: number, length: number = 5) => {
            const geometry = new THREE.CylinderGeometry(0.05, 0.05, length);
            const material = new THREE.MeshBasicMaterial({ color });
            const axis = new THREE.Mesh(geometry, material);

            // Position and rotate the axis
            if (direction.x !== 0) {
                // X-axis (red) - render in negative direction
                axis.rotation.z = Math.PI / 2;
                axis.position.x = -length / 2;
            } else if (direction.y !== 0) {
                // Y-axis (green)
                axis.position.y = length / 2;
            } else if (direction.z !== 0) {
                // Z-axis (blue)
                axis.rotation.x = Math.PI / 2;
                axis.position.z = length / 2;
            }

            return axis;
        };

        // Create text sprite for labels
        const createTextSprite = (text: string, color: string = '#ffffff') => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) return null;

            canvas.width = 128;
            canvas.height = 64;

            context.fillStyle = 'rgba(0, 0, 0, 0)';
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.font = '24px Arial';
            context.fillStyle = color;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(2, 1, 1);

            return sprite;
        };

        // Add thick colored axes
        const xAxis = createAxis(new THREE.Vector3(1, 0, 0), 0xff0000);
        const yAxis = createAxis(new THREE.Vector3(0, 1, 0), 0x00ff00);
        const zAxis = createAxis(new THREE.Vector3(0, 0, 1), 0x0000ff);

        scene.add(xAxis);
        scene.add(yAxis);
        scene.add(zAxis);

        // Add distance labels along axes - only show 5m since that's our new limit
        const distances = [5];
        distances.forEach(distance => {
            // X-axis labels (red) - position on negative X side
            const xLabel = createTextSprite(`${distance}m`, '#ff6666');
            if (xLabel) {
                xLabel.position.set(-distance, 0.5, 0);
                scene.add(xLabel);
            }

            // Y-axis labels (green)
            const yLabel = createTextSprite(`${distance}m`, '#66ff66');
            if (yLabel) {
                yLabel.position.set(0.5, distance, 0);
                scene.add(yLabel);
            }

            // Z-axis labels (blue)
            const zLabel = createTextSprite(`${distance}m`, '#6666ff');
            if (zLabel) {
                zLabel.position.set(0, 0.5, distance);
                scene.add(zLabel);
            }
        });

        // Add axis origin labels
        const xOriginLabel = createTextSprite('X', '#ff6666');
        if (xOriginLabel) {
            xOriginLabel.position.set(-6, 0, 0);
            scene.add(xOriginLabel);
        }

        const yOriginLabel = createTextSprite('Y', '#66ff66');
        if (yOriginLabel) {
            yOriginLabel.position.set(0, 6, 0);
            scene.add(yOriginLabel);
        }

        const zOriginLabel = createTextSprite('Z', '#6666ff');
        if (zOriginLabel) {
            zOriginLabel.position.set(0, 0, 6);
            scene.add(zOriginLabel);
        }

        // Initialize point cloud geometry
        const pointsGeometry = new THREE.BufferGeometry();
        const pointsMaterial = new THREE.PointsMaterial({
            size: 0.02,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial);
        scene.add(pointCloud);
        pointCloudRef.current = pointCloud;
        pointsBufferRef.current = pointsGeometry;

        // Controls (basic mouse interaction)
        let isMouseDown = false;
        let isRightMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;

        const onMouseDown = (event: MouseEvent) => {
            if (event.button === 0) { // Left mouse button
                isMouseDown = true;
            } else if (event.button === 2) { // Right mouse button
                isRightMouseDown = true;
            }
            mouseX = event.clientX;
            mouseY = event.clientY;
        };

        const onMouseMove = (event: MouseEvent) => {
            if (!isMouseDown && !isRightMouseDown) return;

            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;

            if (isMouseDown) {
                // Left mouse: Rotate camera around origin
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(camera.position);
                spherical.theta -= deltaX * 0.01;
                spherical.phi -= deltaY * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

                camera.position.setFromSpherical(spherical);
                camera.lookAt(0, 0, 0);
            } else if (isRightMouseDown) {
                // Right mouse: Pan camera
                const panSpeed = 0.01;
                const right = new THREE.Vector3();
                const up = new THREE.Vector3();

                camera.getWorldDirection(right);
                right.cross(camera.up).normalize();
                up.copy(camera.up);

                const panOffset = new THREE.Vector3();
                panOffset.addScaledVector(right, -deltaX * panSpeed);
                panOffset.addScaledVector(up, deltaY * panSpeed);

                camera.position.add(panOffset);

                // Update the look-at target to maintain the same viewing direction
                const target = new THREE.Vector3(0, 0, 0);
                target.add(panOffset);
                camera.lookAt(target);
            }

            mouseX = event.clientX;
            mouseY = event.clientY;
        };

        const onMouseUp = (event: MouseEvent) => {
            if (event.button === 0) {
                isMouseDown = false;
            } else if (event.button === 2) {
                isRightMouseDown = false;
            }
        };

        const onWheel = (event: WheelEvent) => {
            const distance = camera.position.length();
            // Allow much closer zoom (minimum 0.5m) for detailed inspection
            const newDistance = Math.max(0.5, Math.min(100, distance + event.deltaY * 0.01));
            camera.position.normalize().multiplyScalar(newDistance);
        };

        // Prevent context menu on right click
        const onContextMenu = (event: MouseEvent) => {
            event.preventDefault();
        };

        renderer.domElement.addEventListener('mousedown', onMouseDown);
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mouseup', onMouseUp);
        renderer.domElement.addEventListener('wheel', onWheel);
        renderer.domElement.addEventListener('contextmenu', onContextMenu);

        // Animation loop
        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (!mount || !camera || !renderer) return;
            const newWidth = mount.clientWidth;
            const newHeight = mount.clientHeight;

            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('mousedown', onMouseDown);
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            renderer.domElement.removeEventListener('mouseup', onMouseUp);
            renderer.domElement.removeEventListener('wheel', onWheel);
            renderer.domElement.removeEventListener('contextmenu', onContextMenu);

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            if (mount && renderer.domElement) {
                mount.removeChild(renderer.domElement);
            }

            renderer.dispose();
        };
    }, []);

    // Create color mapping for intensity values
    const getColorFromIntensity = useCallback((intensity: number): THREE.Color => {
        // Normalize intensity (0-255) to (0-1)
        const normalized = intensity / 255;

        // Create color gradient from blue (low) to red (high)
        if (normalized < 0.5) {
            // Blue to green
            return new THREE.Color(0, normalized * 2, 1 - normalized * 2);
        } else {
            // Green to red
            return new THREE.Color((normalized - 0.5) * 2, 1 - (normalized - 0.5) * 2, 0);
        }
    }, []);

    // Clean up old points based on accumulation time
    const cleanupOldPoints = useCallback(() => {
        const currentTime = Date.now();
        const maxAge = accumulationTime * 1000; // Convert to milliseconds

        accumulatedPointsRef.current = accumulatedPointsRef.current.filter(
            point => currentTime - point.timestamp <= maxAge
        );
    }, [accumulationTime]);

    // Update point cloud with accumulated points
    const updatePointCloudFromAccumulated = useCallback(() => {
        if (!pointsBufferRef.current) return;

        const geometry = pointsBufferRef.current;
        const points = accumulatedPointsRef.current;

        if (points.length === 0) {
            // Clear the point cloud if no points
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
            geometry.computeBoundingSphere();

            setPointStats(prev => ({
                ...prev,
                totalPoints: 0
            }));
            return;
        }

        // Filter and process points
        const filteredPoints = PointCloudProcessor.filterByDistance(points, 0.1, 50);
        const processedPoints = PointCloudProcessor.downsample(filteredPoints, 1);

        // Create position and color arrays
        const positions = new Float32Array(processedPoints.length * 3);
        const colors = new Float32Array(processedPoints.length * 3);

        processedPoints.forEach((point, index) => {
            const i = index * 3;

            // Position
            positions[i] = -point.x;
            positions[i + 1] = point.z;
            positions[i + 2] = point.y;

            // Color based on intensity
            const color = getColorFromIntensity(point.intensity);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        });

        // Update geometry
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeBoundingSphere();

        // Update stats
        setPointStats(prev => ({
            ...prev,
            totalPoints: processedPoints.length,
            lastUpdate: Date.now()
        }));

    }, [getColorFromIntensity]);

    // Add new points to accumulation
    const addPointsToAccumulation = useCallback((packet: LidarPacket) => {
        const currentTime = Date.now();

        // Add timestamp to each point
        const timestampedPoints: TimestampedPoint[] = packet.points.map(point => ({
            ...point,
            timestamp: currentTime
        }));

        // Add new points to accumulation
        accumulatedPointsRef.current.push(...timestampedPoints);

        // Clean up old points
        cleanupOldPoints();

        // Update the visual representation
        updatePointCloudFromAccumulated();

        // Update packet count and cumulative points parsed
        setPointStats(prev => ({
            ...prev,
            dataType: LivoxDecoder.getDataTypeDescription(packet.dataType),
            packetsReceived: prev.packetsReceived + 1,
            totalPointsParsed: prev.totalPointsParsed + packet.points.length
        }));

    }, [cleanupOldPoints, updatePointCloudFromAccumulated]);

    // Set up cleanup interval
    useEffect(() => {
        const interval = setInterval(() => {
            cleanupOldPoints();
            updatePointCloudFromAccumulated();
        }, 100); // Clean up every 100ms

        return () => clearInterval(interval);
    }, [cleanupOldPoints, updatePointCloudFromAccumulated]);

    // Handle accumulation time change
    useEffect(() => {
        // When accumulation time changes, clean up immediately
        cleanupOldPoints();
        updatePointCloudFromAccumulated();
    }, [accumulationTime, cleanupOldPoints, updatePointCloudFromAccumulated]);

    // Update point cloud with new data
    const updatePointCloud = useCallback((packet: LidarPacket) => {
        if (!pointsBufferRef.current) return;

        if (packet.points.length === 0) return;

        // Use the new accumulation-based approach
        addPointsToAccumulation(packet);

    }, [addPointsToAccumulation]);

    // Handle lidar data updates
    useEffect(() => {
        if (!lidarData) return;

        console.log('Received lidar data:', lidarData);

        try {
            // Check if we received an already-decoded LidarPacket
            if (lidarData.points && Array.isArray(lidarData.points) && typeof lidarData.dataType === 'number') {
                // Data is already decoded - use it directly
                console.log(`Using pre-decoded packet with ${lidarData.points.length} points`);
                updatePointCloud(lidarData);
                return;
            }

            // Otherwise, try to decode raw binary data (legacy support)
            let dataBuffer: ArrayBuffer;

            if (lidarData instanceof ArrayBuffer) {
                dataBuffer = lidarData;
            } else if (lidarData.data && lidarData.data instanceof ArrayBuffer) {
                dataBuffer = lidarData.data;
            } else if (lidarData.data && lidarData.data instanceof Uint8Array) {
                // LiveKit data as Uint8Array
                dataBuffer = lidarData.data.buffer.slice(
                    lidarData.data.byteOffset,
                    lidarData.data.byteOffset + lidarData.data.byteLength
                ) as ArrayBuffer;
            } else if (lidarData instanceof Uint8Array) {
                dataBuffer = lidarData.buffer.slice(
                    lidarData.byteOffset,
                    lidarData.byteOffset + lidarData.byteLength
                ) as ArrayBuffer;
            } else {
                console.warn('Unsupported lidar data format:', typeof lidarData, lidarData);
                return;
            }

            console.log(`Processing ${dataBuffer.byteLength} bytes of raw lidar data`);

            // Decode the raw binary packet
            const packet = LivoxDecoder.decodePacket(dataBuffer);
            if (packet) {
                console.log(`Successfully decoded packet with ${packet.points.length} points`);
                updatePointCloud(packet);
            } else {
                console.warn('Failed to decode lidar packet');
            }

        } catch (error) {
            console.error('Error processing lidar data:', error);
        }

    }, [lidarData, updatePointCloud]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;

            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="w-full h-full relative">
            <div
                ref={mountRef}
                className="w-full h-full"
                style={{ cursor: 'grab' }}
            />

            {/* Status Overlay */}
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg text-sm font-mono">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span>
                            {isLoading ? 'Connecting...' :
                                connectionError ? 'Connection Error' :
                                    isConnected ? 'LIDAR Online' : 'LIDAR Offline'}
                        </span>
                    </div>
                    <div className="mt-1 text-xs opacity-80">
                        <div>Total Points: {pointStats.totalPointsParsed.toLocaleString()}</div>
                        <div>Points Rendered: {pointStats.totalPoints.toLocaleString()}</div>
                        <div>Type: {pointStats.dataType}</div>
                        <div>Packets: {pointStats.packetsReceived}</div>
                        {pointStats.lastUpdate > 0 && (
                            <div>Updated: {new Date(pointStats.lastUpdate).toLocaleTimeString()}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Accumulation Control */}
            <div className="absolute top-4 right-4 z-10">
                <div className="bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg text-sm font-mono">
                    <div className="mb-2 text-xs opacity-80">Point Accumulation</div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs">1s</span>
                        <div className="flex-1 min-w-[120px]">
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="0.5"
                                value={accumulationTime}
                                onChange={(e) => setAccumulationTime(Number(e.target.value))}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((accumulationTime - 1) / 9) * 100}%, #4b5563 ${((accumulationTime - 1) / 9) * 100}%, #4b5563 100%)`
                                }}
                            />
                        </div>
                        <span className="text-xs">10s</span>
                    </div>
                    <div className="text-center mt-1 text-xs text-blue-300">
                        {accumulationTime}s
                    </div>
                </div>
            </div>

            {/* Controls Info */}
            <div className="absolute bottom-4 right-4 z-10">
                <div className="bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg text-xs font-mono">
                    <div>Left Mouse: Rotate</div>
                    <div>Right Mouse: Pan</div>
                    <div>Wheel: Zoom</div>
                    <div className="mt-1 opacity-70">
                        <div>Color: Intensity</div>
                        <div>Blue → Green → Red</div>
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-20">
                    <div className="bg-white px-6 py-4 rounded-lg shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="text-gray-700">Initializing LIDAR viewer...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Overlay */}
            {connectionError && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-20">
                    <div className="bg-white px-6 py-4 rounded-lg shadow-lg max-w-md">
                        <div className="flex items-center gap-3 text-red-600 mb-2">
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                <span className="text-sm font-bold">!</span>
                            </div>
                            <span className="font-semibold">Connection Error</span>
                        </div>
                        <p className="text-gray-700 text-sm">{connectionError}</p>
                    </div>
                </div>
            )}

            <style jsx>{`
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 2px solid #ffffff;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .slider::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 2px solid #ffffff;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
            `}</style>
        </div>
    );
} 