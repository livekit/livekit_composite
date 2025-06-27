import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export async function POST(request: NextRequest) {
  try {
    if (!LIVEKIT_URL) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (!API_KEY) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (!API_SECRET) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Get room name from request body
    const { roomName } = await request.json();

    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    // Create RoomServiceClient
    const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);

    // Delete the room
    await roomService.deleteRoom(roomName);

    return NextResponse.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete room' },
      { status: 500 }
    );
  }
}
