import { getLiveKitCredentialsFromRequest } from "@/lib/livekit-utils";
import { RoomServiceClient } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const req = await request.json();
    const { API_KEY, API_SECRET, LIVEKIT_URL } = await getLiveKitCredentialsFromRequest(req);
    const { roomName, identity, trackSid, muted } = req;

    if (!roomName || !identity || !trackSid || typeof muted !== "boolean") {
      return new NextResponse("Invalid request body", { status: 400 });
    }

    const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);
    const trackInfo = await roomService.mutePublishedTrack(roomName, identity, trackSid, muted);

    return NextResponse.json(trackInfo);
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  console.error(error);
  return new NextResponse(error instanceof Error ? error.message : "Internal server error", {
    status: 500,
  });
}
