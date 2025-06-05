import { NextRequest, NextResponse } from "next/server";

import {
  AccessTokenOptions,
  VideoGrant,
  AccessToken,
  RoomServiceClient,
} from "livekit-server-sdk";

export interface TokenResult {
  identity: string;
  token: string;
  serverUrl: string;
}

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL!.replace(
  "wss://",
  "https://"
);

const roomService = new RoomServiceClient(livekitHost);

const createToken = (userInfo: AccessTokenOptions, grant: VideoGrant) => {
  const at = new AccessToken(apiKey, apiSecret, userInfo);
  at.addGrant(grant);
  return at.toJwt();
};

export async function GET(request: NextRequest) {
  try {
    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({
          error: "Environment variables aren't set up correctly",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { searchParams } = request.nextUrl;
    const partyId = searchParams.get("party_id")!;
    const userName = searchParams.get("name")!;
    const host = searchParams.get("host")! === "true";

    const roomName = partyId;
    const identity = userName;

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: host,
      canPublishData: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    };
    const userInfo: AccessTokenOptions = {
      identity,
    };
    const token = await createToken(userInfo, grant);

    const result: TokenResult = {
      identity,
      token,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: (e as Error).message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
