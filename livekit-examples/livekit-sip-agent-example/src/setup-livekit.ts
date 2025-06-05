import {SipClient} from 'livekit-server-sdk';
import {verifyEnv} from './env.js';

const {
  LIVEKIT_API_KEY = '',
  LIVEKIT_API_SECRET = '',
  LIVEKIT_URL = '',
  TWILIO_PHONE_NUMBER = '',
  TWILIO_SIP_USERNAME = '',
  TWILIO_SIP_PASSWORD = '',
} = verifyEnv([
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'LIVEKIT_URL',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_SIP_USERNAME',
  'TWILIO_SIP_PASSWORD',
]);

const sipClient = new SipClient(
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
);

console.log('Setting up LiveKit SIP inbound trunk and dispatch rule');

// Inbound trunk setup: https://docs.livekit.io/sip/quickstarts/configuring-sip-trunk/#inbound-trunk-setup
const trunkName = 'inbound-trunk';
const trunks = await sipClient.listSipInboundTrunk();
let trunk = trunks.find(t => t.name === trunkName);

if (!trunk) {
  console.log('Creating LiveKit SIP inbound trunk');
  trunk = await sipClient.createSipInboundTrunk(
    trunkName,
    [TWILIO_PHONE_NUMBER],
    {
      auth_username: TWILIO_SIP_USERNAME,
      auth_password: TWILIO_SIP_PASSWORD,
    },
  );
} else {
  console.log('LiveKit SIP inbound trunk already exists');
}

// Create a dispatch rule: https://docs.livekit.io/sip/quickstarts/configuring-sip-trunk/#create-a-dispatch-rule
const dispatchRuleName = 'inbound-dispatch-rule';
const dispatchRules = await sipClient.listSipDispatchRule();
let dispatchRule = dispatchRules.find(r => r.name === dispatchRuleName);

if (!dispatchRule) {
  console.log('Creating LiveKit SIP dispatch rule');
  dispatchRule = await sipClient.createSipDispatchRule(
    {
      type: 'individual',
      roomPrefix: 'call',
    },
    {
      name: dispatchRuleName,
      trunkIds: [trunk.sipTrunkId],
    },
  );
} else {
  console.log('LiveKit SIP dispatch rule already exists');
}

console.log(`
---
Assuming you've already run the command \`npm run setup:twilio\` then you're all set!

Make sure your \`.env.local\` file has all the required environment variables, including your OpenAI API key.

Now you can run the command \`npm run agent\` and call ${TWILIO_PHONE_NUMBER}
---
`);
