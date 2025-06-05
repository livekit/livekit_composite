import { getLiveKitCredentialsFromRequest } from "@/lib/livekit-utils";
import { RoomServiceClient } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const req = await request.json();
    const { API_KEY, API_SECRET, LIVEKIT_URL } = await getLiveKitCredentialsFromRequest(req);
    const { roomName, data, kind, options } = req;

    if (!roomName || !data || !kind) {
      return new NextResponse("Invalid request body", { status: 400 });
    }

    const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);
    await roomService.sendData(roomName, new Uint8Array(data), kind, options);

    return NextResponse.json({ success: true });
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
