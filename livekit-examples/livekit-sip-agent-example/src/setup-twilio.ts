import twilio from 'twilio';
import {verifyEnv} from './env.js';

// NOTE: you are expected to define the following environment variables in `.env.local`:
const {
  LIVEKIT_SIP_URI = '',
  TWILIO_ACCOUNT_SID = '',
  TWILIO_AUTH_TOKEN = '',
  TWILIO_PHONE_NUMBER = '',
} = verifyEnv([
  'LIVEKIT_SIP_URI',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
]);

const sipHost = LIVEKIT_SIP_URI.startsWith('sip:')
  ? LIVEKIT_SIP_URI.split('sip:')[1]
  : LIVEKIT_SIP_URI;
const sipUri = `sip:${sipHost};transport=tcp`;

// Twilio Setup
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

console.log('Setting up Twilio SIP trunk');

// Step 1. Create a SIP trunk: https://docs.livekit.io/sip/quickstarts/configuring-twilio-trunk/#step-1-create-a-sip-trunk
const trunks = await twilioClient.trunking.v1.trunks.list();
let trunk = trunks.find(async t => {
  const list = await t.originationUrls().list();
  return list.find(o => o.sipUrl === sipUri);
});

if (!trunk) {
  console.log('Creating Twilio SIP trunk');
  trunk = await twilioClient.trunking.v1.trunks.create({
    friendlyName: 'LiveKit SIP trunk',
  });
} else {
  console.log('Twilio SIP trunk already exists');
}

// Step 2: Configure your trunk: https://docs.livekit.io/sip/quickstarts/configuring-twilio-trunk/#step-2-configure-your-trunk
const originationUrls = await trunk.originationUrls().list();
let originationUrl = originationUrls.find(o => o.sipUrl === sipUri);

if (!originationUrl) {
  console.log('Creating Twilio SIP origination URL');
  originationUrl = await trunk.originationUrls().create({
    weight: 1,
    priority: 1,
    friendlyName: 'LiveKit SIP URI',
    sipUrl: sipUri,
    enabled: true,
  });
} else {
  console.log('Twilio SIP origination URL already exists');
}

// Step 3: Associate phone number and trunk: https://docs.livekit.io/sip/quickstarts/configuring-twilio-trunk/#step-3-associate-phone-number-and-trunk
const phoneNumbers = await trunk.phoneNumbers().list();
let phoneNumber = phoneNumbers.find(p => p.phoneNumber === TWILIO_PHONE_NUMBER);

if (!phoneNumber) {
  console.log('Linking Twilio phone number with trunk');
  const incomingPhoneNumbers = await twilioClient.incomingPhoneNumbers.list();
  const incomingPhoneNumber = incomingPhoneNumbers.find(
    i => i.phoneNumber === TWILIO_PHONE_NUMBER,
  );
  if (!incomingPhoneNumber)
    throw new Error(`No phone number matching ${TWILIO_PHONE_NUMBER} found`);
  phoneNumber = await trunk.phoneNumbers().create({
    phoneNumberSid: incomingPhoneNumber.sid,
  });
} else {
  console.log('Twilio phone number already associated with trunk');
}

// Setup Twilio SIP credentials list
const credentialsLists = await trunk.credentialsLists().list();
let credentialsList = credentialsLists.find(c => c.trunkSid === trunk.sid);

if (!credentialsList) {
  console.log('Creating Twilio SIP credentials list');
  const newCredential = await twilioClient.sip.credentialLists.create({
    friendlyName: 'LiveKit SIP Credentials',
  });
  credentialsList = await trunk
    .credentialsLists()
    .create({credentialListSid: newCredential.sid});
  console.warn(
    'Be sure to visit https://www.twilio.com/user/account/sip-trunking/trunks and create credentials for list name:',
    newCredential.friendlyName,
  );
} else {
  console.log('Twilio SIP credentials list already exists');
}

console.log(`
---
Be sure to follow the steps to enable "Inbound calls with Twilio programmable voice" found here:
https://docs.livekit.io/sip/accepting-calls-twilio-voice

After that run the command \`npm run setup:livekit\`

Don't forget to set the SIP trunk username and password in the \`.env.local\` file as \`TWILIO_SIP_USERNAME\` and \`TWILIO_SIP_PASSWORD\`
---
`);
