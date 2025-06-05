import dotenv from 'dotenv';
import express from 'express';
import { AccessToken } from 'livekit-server-sdk';

type TokenRequest = {
  roomName: string;
  participantName: string;
};

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

// This route handler creates a token for a given room and participant
async function createToken({ roomName, participantName }: TokenRequest) {
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
  return at.toJwt();
}

const app = express();
const port = 3000;

app.post('/createToken', async (req, res) => {
  const { roomName = 'demo-room', participantName = 'demo-user' } = req.body ?? {};
  res.send(await createToken({ roomName, participantName }));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
