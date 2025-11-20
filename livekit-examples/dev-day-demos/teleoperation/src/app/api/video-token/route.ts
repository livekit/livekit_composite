import { NextRequest, NextResponse } from 'next/server';
import { Controller } from '@/lib/controller';

function generateRandomViewerId(): string {
    //return "viewer";
    const randomNum = Math.floor(Math.random() * 1000);
    return `viewer${randomNum.toString().padStart(3, '0')}`;
}

export async function GET(request: NextRequest) {
    try {
        const controller = new Controller();
        const viewerIdentity = generateRandomViewerId();
        const roomName = 'robot';

        // Use the existing joinStream method to get a token
        const response = await controller.joinStream({
            room_name: roomName,
            identity: viewerIdentity,
        });

        return NextResponse.json({
            token: response.connection_details.token,
            serverUrl: response.connection_details.ws_url,
            identity: viewerIdentity,
            roomName: roomName,
        });

    } catch (error) {
        console.error('Error generating LiveKit token:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate token' },
            { status: 500 }
        );
    }
} 