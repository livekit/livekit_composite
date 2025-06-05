# LiveKit Agent Examples - SIP Make a Call

This project demonstrates how to have a LiveKit agent make an outbound phone call using LiveKit's telephony capabilities. It creates a room, connects an agent, and initiates a SIP call to a specified phone number.

## Prerequisites 📋

- Node.js (v22 or higher) 💻
- [A LiveKit server instance 📡](https://docs.livekit.io/home/self-hosting/server-setup/)
- [An OpenAI API key 🔑](https://platform.openai.com/api-keys)
- LiveKit API Key, Secret, and URL 🌐
- [A SIP outbound trunk  📡](https://docs.livekit.io/sip/quickstarts/configuring-sip-trunk/#create-an-outbound-trunk)

## Setup 🛠️

1. Clone the repository:

   ```bash
   git clone https://github.com/livekit-examples/agents-examples-node.git
   cd agents-examples-node/sip/make-a-call
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file with your API keys:

   ```bash
   cp .env.example .env.local
   ```

4. Configure your environment variables in `.env.local`:

   - `LIVEKIT_API_KEY`: Your LiveKit API key
   - `LIVEKIT_API_SECRET`: Your LiveKit API secret
   - `LIVEKIT_URL`: Your LiveKit server URL
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SIP_OUTBOUND_TRUNK_ID`: Your SIP outbound trunk ID

5. In one terminal instance, start the agent:

   ```bash
   npm run start:agent
   ```

6. In another terminal instance, make a call:

   ```bash
   npm run start:call <us_phone_number_to_call>
   ```

## How It Works 🤔

1. The script takes a 10-digit US phone number as input
2. It formats the number to E.164 format (e.g., +1234567890)
3. Creates a new LiveKit room with a random name
4. Connects an agent to the room
5. Uses the LiveKit SIP client to create a SIP participant and initiate the call

## License 📝

[Apache-2.0](../LICENSE.md)
