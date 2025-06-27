import { NextRequest, NextResponse } from 'next/server';
import {
  AccessToken,
  type AccessTokenOptions,
  SipClient,
  type VideoGrant,
} from 'livekit-server-sdk';

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// don't cache the results
export const revalidate = 0;

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function GET(request: NextRequest) {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Get phone number from query params
    const searchParams = request.nextUrl.searchParams;
    const phoneNumber = searchParams.get('phoneNumber');

    // Generate participant token
    const participantName = 'user';
    const participantIdentity = `sip_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `sip_room_${Math.floor(Math.random() * 10_000)}`;
    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName
    );

    // If phone number is provided, create a SIP participant
    if (phoneNumber) {
      const trunkId = process.env.LIVEKIT_SIP_TRUNK_ID;
      if (!trunkId) {
        throw new Error('LIVEKIT_SIP_TRUNK_ID is not defined. Please configure your SIP trunk.');
      }

      const sipClient = new SipClient(LIVEKIT_URL, API_KEY, API_SECRET);

      try {
        await sipClient.createSipParticipant(trunkId, phoneNumber, roomName, {
          participantIdentity: `sip_${phoneNumber}`,
          participantName: `Phone: ${phoneNumber}`,
          playDialtone: true,
          waitUntilAnswered: true,
        });
      } catch (sipError) {
        console.error('Error creating SIP participant:', sipError);
        throw new Error('Failed to create SIP participant. Please check your SIP configuration.');
      }
    }

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName,
    };
    const headers = new Headers({
      'Cache-Control': 'no-store',
    });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}
