import {
  AgentDispatchClient,
  RoomServiceClient,
  SipClient,
} from 'livekit-server-sdk';

import {agentName} from './agent.js';

const {
  LIVEKIT_API_KEY = '',
  LIVEKIT_API_SECRET = '',
  LIVEKIT_URL = '',
  SIP_OUTBOUND_TRUNK_ID = '',
} = process.env;

/**
 * Formats a phone number to E.164 format for SIP compatibility
 * @param number - Raw phone number input
 * @returns Formatted phone number in E.164 format
 * @throws Error if the phone number is invalid
 */
function formatPhoneNumber(number = ''): string {
  const digits = number.replace(/\D/g, '');
  if (digits.length !== 10) {
    throw new Error(
      'Invalid phone number format. Please enter a 10-digit US phone number.',
    );
  }
  return `+1${digits}`;
}

/**
 * Makes a call to a specified phone number using LiveKit and SIP
 * @param phoneNumber - The phone number to dial
 * @throws Error if the phone number is invalid or if there is an error creating the SIP participant
 */
async function makeCall(phoneNumber: string) {
  const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
  const agentDispatchClient = new AgentDispatchClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
  );
  const roomServiceClient = new RoomServiceClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
  );
  const sipClient = new SipClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
  );

  const roomName = `room_${Math.floor(Math.random() * 10_000)}`;
  const participantIdentity = `caller_${formattedPhoneNumber}}`;

  await roomServiceClient.createRoom({name: roomName, emptyTimeout: 60});

  // Create agent dispatch
  console.log(`Creating dispatch for agent ${agentName} in room ${roomName}`);
  const dispatch = await agentDispatchClient.createDispatch(
    roomName,
    agentName,
    {
      metadata: formattedPhoneNumber,
    },
  );
  console.log(`Created dispatch: ${dispatch.id}`);

  // Create SIP participant to make the call
  if (!SIP_OUTBOUND_TRUNK_ID.startsWith('ST_')) {
    throw new Error('SIP_OUTBOUND_TRUNK_ID is not set or invalid');
  }

  console.log(`Dialing ${formattedPhoneNumber} to room ${roomName}`);

  try {
    // Create SIP participant to initiate the call
    const sipParticipant = await sipClient.createSipParticipant(
      SIP_OUTBOUND_TRUNK_ID,
      formattedPhoneNumber,
      roomName,
      {participantIdentity},
    );
    console.log(`Created SIP participant: ${sipParticipant.participantId}`);
  } catch (e) {
    console.error(
      `Error creating SIP participant: ${e instanceof Error ? e.message : e}`,
    );
  }
}

// Get phone number from command line arguments
const args = process.argv.slice(2);
const phoneNumber = args[0] ?? '';
console.log(`Dialing ${phoneNumber}`);
await makeCall(phoneNumber);
