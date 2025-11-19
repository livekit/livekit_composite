export interface LidarPoint {
    x: number;
    y: number;
    z: number;
    intensity: number;
    timestamp: number;
}

export interface LidarPacket {
    points: LidarPoint[];
    dataType: number;
    timestamp: number;
    packetSize: number;
}

export class LivoxDecoder {
    private static readonly HEADER_SIZE = 18;

    /**
     * Decode a raw binary lidar data packet
     */
    static decodePacket(data: ArrayBuffer): LidarPacket | null {
        try {
            const uint8Array = new Uint8Array(data);
            return this.decodeBinaryPacket(uint8Array);
        } catch (error) {
            console.error('Error decoding lidar packet:', error);
            return null;
        }
    }

    /**
     * Decode binary lidar data packet
     */
    private static decodeBinaryPacket(data: Uint8Array): LidarPacket | null {
        if (data.length < this.HEADER_SIZE) {
            console.warn(`Packet too small for header: ${data.length} bytes, need at least ${this.HEADER_SIZE}`);
            return null;
        }

        try {
            // Parse header
            const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);

            // Header structure (little-endian):
            // [0] Version
            // [1-8] Various fields  
            // [9] Data Type
            // [10-17] Timestamp (64-bit)

            const dataType = dataView.getUint8(9);
            const timestampRaw = dataView.getBigUint64(10, true); // little-endian
            const timestamp = Number(timestampRaw) / 1000000.0; // Convert to seconds

            console.log(`Parsing packet: length=${data.length}, dataType=${dataType}, timestamp=${timestamp}`);

            // Parse points based on data type
            let points: LidarPoint[] = [];

            switch (dataType) {
                case 0:
                    points = this.parseCartesianSingle(data, this.HEADER_SIZE, timestamp);
                    break;
                case 1:
                    points = this.parseSphericalSingle(data, this.HEADER_SIZE, timestamp);
                    break;
                case 2:
                    points = this.parseHorizonCartesianSingle(data, this.HEADER_SIZE, timestamp);
                    break;
                case 3:
                    points = this.parseHorizonSphericalSingle(data, this.HEADER_SIZE, timestamp);
                    break;
                default:
                    console.warn(`Unknown data type: ${dataType}`);
                    return null;
            }

            console.log(`Parsed ${points.length} points from data type ${dataType}`);

            return {
                points,
                dataType,
                timestamp,
                packetSize: data.length
            };
        } catch (error) {
            console.error('Error parsing binary packet:', error);
            return null;
        }
    }

    /**
     * Parse standard Cartesian single return (data_type=0)
     * 100 points per packet, 13 bytes per point
     */
    private static parseCartesianSingle(data: Uint8Array, offset: number, baseTimestamp: number): LidarPoint[] {
        const points: LidarPoint[] = [];
        const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
        let bytePos = offset;
        let timestamp = baseTimestamp - 0.00001;

        for (let i = 0; i < 100; i++) {
            if (bytePos + 13 > data.length) break;

            // Parse coordinates (32-bit signed integers in millimeters)
            const xMm = dataView.getInt32(bytePos, true); // little-endian
            const yMm = dataView.getInt32(bytePos + 4, true);
            const zMm = dataView.getInt32(bytePos + 8, true);
            const intensity = dataView.getUint8(bytePos + 12);

            timestamp += 0.00001;
            bytePos += 13;

            // Convert mm to meters and filter out zero points
            if (xMm !== 0 || yMm !== 0 || zMm !== 0) {
                points.push({
                    x: xMm / 1000.0,
                    y: yMm / 1000.0,
                    z: zMm / 1000.0,
                    intensity,
                    timestamp
                });
            }
        }

        return points;
    }

    /**
     * Parse standard Spherical single return (data_type=1)
     * 100 points per packet, 9 bytes per point
     */
    private static parseSphericalSingle(data: Uint8Array, offset: number, baseTimestamp: number): LidarPoint[] {
        const points: LidarPoint[] = [];
        const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
        let bytePos = offset;
        let timestamp = baseTimestamp - 0.00001;

        for (let i = 0; i < 100; i++) {
            if (bytePos + 9 > data.length) break;

            // Parse spherical coordinates
            const distanceMm = dataView.getUint32(bytePos, true);
            const zenith = dataView.getUint16(bytePos + 4, true) / 100.0; // degrees
            const azimuth = dataView.getUint16(bytePos + 6, true) / 100.0; // degrees
            const intensity = dataView.getUint8(bytePos + 8);

            timestamp += 0.00001;
            bytePos += 9;

            // Convert spherical to Cartesian if distance is non-zero
            if (distanceMm > 0) {
                const distanceM = distanceMm / 1000.0;
                const { x, y, z } = this.sphericalToCartesian(distanceM, zenith, azimuth);

                points.push({
                    x,
                    y,
                    z,
                    intensity,
                    timestamp
                });
            }
        }

        return points;
    }

    /**
     * Parse Horizon/Tele-15 Cartesian single return (data_type=2)
     * 96 points per packet, 14 bytes per point
     */
    private static parseHorizonCartesianSingle(data: Uint8Array, offset: number, baseTimestamp: number): LidarPoint[] {
        const points: LidarPoint[] = [];
        const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
        let bytePos = offset;
        let timestamp = baseTimestamp - 0.000004167;

        for (let i = 0; i < 96; i++) {
            if (bytePos + 14 > data.length) break;

            // Check Y coordinate first (non-zero indicates valid point)
            const yMm = dataView.getInt32(bytePos + 4, true);
            timestamp += 0.000004167;

            if (yMm !== 0) {
                const xMm = dataView.getInt32(bytePos, true);
                const zMm = dataView.getInt32(bytePos + 8, true);
                const intensity = dataView.getUint8(bytePos + 12);
                // bytePos + 13 is tag bits (skip)

                points.push({
                    x: xMm / 1000.0,
                    y: yMm / 1000.0,
                    z: zMm / 1000.0,
                    intensity,
                    timestamp
                });
            }

            bytePos += 14;
        }

        return points;
    }

    /**
     * Parse Horizon/Tele-15 Spherical single return (data_type=3)
     * 96 points per packet, 10 bytes per point
     */
    private static parseHorizonSphericalSingle(data: Uint8Array, offset: number, baseTimestamp: number): LidarPoint[] {
        const points: LidarPoint[] = [];
        const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
        let bytePos = offset;
        let timestamp = baseTimestamp - 0.000004167;

        for (let i = 0; i < 96; i++) {
            if (bytePos + 10 > data.length) break;

            const distanceMm = dataView.getUint32(bytePos, true);
            timestamp += 0.000004167;

            if (distanceMm > 0) {
                const zenith = dataView.getUint16(bytePos + 4, true) / 100.0;
                const azimuth = dataView.getUint16(bytePos + 6, true) / 100.0;
                const intensity = dataView.getUint8(bytePos + 8);

                const distanceM = distanceMm / 1000.0;
                const { x, y, z } = this.sphericalToCartesian(distanceM, zenith, azimuth);

                points.push({
                    x,
                    y,
                    z,
                    intensity,
                    timestamp
                });
            }

            bytePos += 10;
        }

        return points;
    }

    /**
     * Convert spherical coordinates to Cartesian coordinates
     */
    private static sphericalToCartesian(distance: number, zenithDeg: number, azimuthDeg: number): { x: number; y: number; z: number } {
        // Convert degrees to radians
        const zenithRad = (zenithDeg * Math.PI) / 180;
        const azimuthRad = (azimuthDeg * Math.PI) / 180;

        // Spherical to Cartesian conversion
        const x = distance * Math.sin(zenithRad) * Math.cos(azimuthRad);
        const y = distance * Math.sin(zenithRad) * Math.sin(azimuthRad);
        const z = distance * Math.cos(zenithRad);

        return { x, y, z };
    }

    /**
     * Get human-readable data type description
     */
    static getDataTypeDescription(dataType: number): string {
        switch (dataType) {
            case 0: return 'Standard Cartesian (Single Return)';
            case 1: return 'Standard Spherical (Single Return)';
            case 2: return 'Horizon/Tele-15 Cartesian (Single Return)';
            case 3: return 'Horizon/Tele-15 Spherical (Single Return)';
            default: return `Unknown Data Type (${dataType})`;
        }
    }
}

/**
 * Utility class for point cloud data processing
 */
export class PointCloudProcessor {
    /**
     * Filter points by distance from origin
     */
    static filterByDistance(points: LidarPoint[], minDistance: number = 0, maxDistance: number = Infinity): LidarPoint[] {
        return points.filter(point => {
            const distance = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
            return distance >= minDistance && distance <= maxDistance;
        });
    }

    /**
     * Filter points by intensity
     */
    static filterByIntensity(points: LidarPoint[], minIntensity: number = 0, maxIntensity: number = 255): LidarPoint[] {
        return points.filter(point => point.intensity >= minIntensity && point.intensity <= maxIntensity);
    }

    /**
     * Downsample points by taking every nth point
     */
    static downsample(points: LidarPoint[], factor: number): LidarPoint[] {
        if (factor <= 1) return points;
        return points.filter((_, index) => index % factor === 0);
    }

    /**
     * Get bounding box of point cloud
     */
    static getBoundingBox(points: LidarPoint[]): { min: { x: number; y: number; z: number }, max: { x: number; y: number; z: number } } {
        if (points.length === 0) {
            return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
        }

        let minX = points[0].x, maxX = points[0].x;
        let minY = points[0].y, maxY = points[0].y;
        let minZ = points[0].z, maxZ = points[0].z;

        for (const point of points) {
            if (point.x < minX) minX = point.x;
            if (point.x > maxX) maxX = point.x;
            if (point.y < minY) minY = point.y;
            if (point.y > maxY) maxY = point.y;
            if (point.z < minZ) minZ = point.z;
            if (point.z > maxZ) maxZ = point.z;
        }

        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        };
    }
} 