# LiveKit Agent Examples - SIP Um, Actually

This project demonstrates how to create a LiveKit Agent that can answer SIP calls using Twilio as the SIP provider. The agent uses OpenAI's capabilities to process and respond to voice calls and hosts a game of ["Um, Actually"](https://www.dropout.tv/um-actually) with the caller.

## Prerequisites 📋

- Node.js (v20 or higher) 💻
- [A LiveKit server instance 📡](https://docs.livekit.io/home/self-hosting/server-setup/)
- A Twilio account with SIP trunking capabilities ☎️
- [An OpenAI API key 🔑](https://platform.openai.com/api-keys)
- LiveKit API Key, Secret, and URL 🌐

## Project Structure 📂

```txt
.
├── src/
│   ├── agent.ts         # Main agent implementation
│   ├── setup-livekit.ts # LiveKit setup script
│   └── setup-twilio.ts  # Twilio setup script
├── .env.example         # Example environment variables, copy to .env.local and fill in your own values
```

## Setup 🛠️

1. Clone and setup the repository:

   ```bash
   git clone https://github.com/livekit-examples/node-agents-examples.git

   cd node-agents-examples
   
   npm install
   
   cd packages/sip--um-actually
   ```

2. Create a `.env.local` file with your API keys:

   ```bash
   cp .env.example .env.local
   ```

3. Configure your environment variables in `.env.local`:
   - `LIVEKIT_API_KEY`: Your LiveKit API key
   - `LIVEKIT_API_SECRET`: Your LiveKit API secret
   - `LIVEKIT_URL`: Your LiveKit server URL
   - `LIVEKIT_SIP_URI`: Your LiveKit SIP URI
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number (e.g. +12345678901)
   - `TWILIO_ACCOUNT_SID`: Your Twilio account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio auth token
   - `TWILIO_SIP_USERNAME`: Your Twilio SIP username (You may end up generating this after running the setup script)
   - `TWILIO_SIP_PASSWORD`: Your Twilio SIP password (You may end up generating this after running the setup script)

4. Set up Twilio:

   ```bash
   npm run setup:twilio
   ```

   This will follow the steps outlined in the LiveKit [Create and configure a Twilio SIP trunk](https://docs.livekit.io/sip/quickstarts/configuring-twilio-trunk/) guide. You will need to have a Twilio account and a phone number. Be sure to follow the steps in the [Inbound calls with Twilio Voice](https://docs.livekit.io/sip/accepting-calls-twilio-voice/) guide after running the setup script.

5. Set up LiveKit:

   ```bash
   npm run setup:livekit
   ```

   This will follow the steps outlined in the LiveKit [SIP inbound trunk](https://docs.livekit.io/sip/trunk-inbound/) guide.

## Running the Agent 🚀

To start the agent:

```bash
npm run agent
```

The agent will now be ready to receive SIP calls through your Twilio phone number.

## How It Works 🤔

1. When a call comes in through your Twilio phone number, it's routed to your LiveKit SIP URI
2. LiveKit receives the call and establishes a connection to a room
3. A LiveKit Agent is automatically dispatched to join the room
4. The agent uses OpenAI's capabilities host a game of "Um, Actually" with the caller

## Agent Functions 🤖

The agent has several built-in functions to manage the game:

- `gameEnd`: Ends the game and deletes the room after a 20-second delay
- `userPoints`: Tracks when the caller earns a point and updates their score
- `systemPoints`: Tracks when the agent earns a point and updates their score
- `pointsStatus`: Provides the current score status when requested by the caller

The agent maintains a running score throughout the game, tracking points for both the caller and itself. The game continues until either party ends the call or the `gameEnd` function is triggered.

## License 📝

[Apache-2.0](../../LICENSE.md)
