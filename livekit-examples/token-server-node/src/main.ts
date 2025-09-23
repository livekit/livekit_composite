import { RoomConfiguration } from '@livekit/protocol';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express from 'express';
import { AccessToken } from 'livekit-server-sdk';

type TokenRequest = {
  room_name?: string;
  participant_name?: string;
  participant_identity?: string;
  participant_metadata?: string;
  participant_attributes?: Record<string, string>;
  room_config?: ReturnType<RoomConfiguration['toJson']>;

  // (old fields, here for backwards compatibility)
  roomName?: string;
  participantName?: string;
};

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

// This route handler creates a token for a given room and participant
async function createToken(request: TokenRequest) {
  const roomName = request.room_name ?? request.roomName!;
  const participantName = request.participant_name ?? request.participantName!;

  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: participantName,
    // Token to expire after 10 minutes
    ttl: '10m',
  });

  // Token permissions can be added here based on the
  // desired capabilities of the participant
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canUpdateOwnMetadata: true,
  });

  if (request.participant_identity) {
    at.identity = request.participant_identity;
  }
  if (request.participant_metadata) {
    at.metadata = request.participant_metadata;
  }
  if (request.participant_attributes) {
    at.attributes = request.participant_attributes;
  }
  if (request.room_config) {
    at.roomConfig = RoomConfiguration.fromJson(request.room_config);
  }

  return at.toJwt();
}

const app = express();
app.use(bodyParser.json());
const port = 3000;

app.post('/createToken', async (req, res) => {
  const body = req.body ?? {};
  body.roomName = body.roomName ?? `room-${crypto.randomUUID()}`;
  body.participantName = body.participantName ?? `user-${crypto.randomUUID()}`;

  try {
    res.send({
      server_url: process.env.LIVEKIT_URL,
      participant_token: await createToken(body),
    });
  } catch (err) {
    console.error('Error generating token:', err);
    res.status(500).send({ message: 'Generating token failed' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
