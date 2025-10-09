import { getLiveKitCredentialsFromRequest } from "@/lib/livekit-utils";
import {
  AccessToken,
  AccessTokenOptions,
  VideoGrant,
} from "livekit-server-sdk";
import { NextResponse } from "next/server";

export const revalidate = 0;

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function POST(request: Request) {
  try {
    const req = await request.json();
    const { roomName, userId, hidden: hiddenFromRequest } = req;
    const { API_KEY, API_SECRET, LIVEKIT_URL } =
      await getLiveKitCredentialsFromRequest(req);

    if (!roomName || !userId) {
      throw new Error("Missing roomName or userId parameters");
    }

    const hidden =
      typeof hiddenFromRequest === "boolean"
        ? hiddenFromRequest
        : typeof hiddenFromRequest === "string"
        ? hiddenFromRequest === "true"
        : false;

    // Generate participant token with provided values
    const participantToken = await createParticipantToken(
      { identity: userId },
      roomName,
      API_KEY,
      API_SECRET,
      { hidden }
    );

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName: userId,
    };

    return NextResponse.json(data, {
      headers: new Headers({ "Cache-Control": "no-store" }),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  apiKey: string,
  apiSecret: string,
  options: { hidden: boolean }
) {
  const at = new AccessToken(apiKey, apiSecret, {
    ...userInfo,
    ttl: "60m",
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    hidden: options.hidden,
  };

  at.addGrant(grant);
  return at.toJwt();
}
