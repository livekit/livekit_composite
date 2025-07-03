# LiveKit SIP Phone Caller

This is a web-based SIP phone caller application built with [LiveKit](https://livekit.io) that enables making phone calls through your browser using LiveKit's SIP integration. It provides a simple interface for dialing phone numbers and managing calls with high-quality audio.

This template is built with Next.js and TypeScript, and is free for you to use or modify as you see fit.

## Features

- 📞 Make outbound phone calls through SIP trunks
- 🎙️ Audio controls with mute/unmute functionality
- 📊 Real-time audio visualizer
- 🎛️ Audio device selection
- 🌓 Dark/light theme support
- 📱 Responsive design for mobile and desktop

## Prerequisites

Before you begin, you'll need:

1. A [LiveKit Cloud](https://cloud.livekit.io) account or self-hosted LiveKit server
2. A configured SIP trunk with LiveKit (see [SIP documentation](https://docs.livekit.io/sip/))
3. Node.js 18+ and pnpm installed

## Getting started

### 1. Clone and install

```bash
git clone <repository-url>
cd node_web_caller
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your LiveKit credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# LiveKit server URL (e.g., wss://your-project.livekit.cloud)
LIVEKIT_URL=your-livekit-server-url

# LiveKit API credentials
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# SIP trunk ID from your LiveKit configuration
LIVEKIT_SIP_TRUNK_ID=your-sip-trunk-id
```

### 3. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### SIP Trunk Setup

To use this application, you need to configure a SIP trunk in LiveKit. Follow the [LiveKit SIP documentation](https://docs.livekit.io/sip/) to:

1. Set up a SIP trunk with your provider
2. Configure the trunk in LiveKit
3. Get your trunk ID for the environment variable

### Customization

You can customize the application by modifying:

- `app-config.ts` - Application branding and settings
- `components/welcome.tsx` - Landing page content
- `components/session-view.tsx` - In-call interface
- Theme colors in `app/globals.css`

## Architecture

The application consists of:

- **Frontend**: Next.js app with LiveKit React components
- **API Routes**:
  - `/api/connection-details` - Creates rooms and SIP participants
  - `/api/delete-room` - Cleans up rooms after calls
- **LiveKit Integration**: Uses LiveKit's SIP API to create phone call participants

## Deployment

This application can be deployed to any platform that supports Next.js:

- Vercel (recommended)
- Netlify
- AWS Amplify
- Self-hosted with Node.js

Make sure to set your environment variables in your deployment platform.

## Troubleshooting

### Common Issues

1. **"LIVEKIT_SIP_TRUNK_ID is not defined"** - Make sure you've configured your SIP trunk and added the ID to `.env.local`
2. **Connection errors** - Verify your LiveKit URL and API credentials
3. **Call fails to connect** - Check that your SIP trunk is properly configured and the phone number format is correct

### Debug Mode

The application includes a debug mode that shows connection details. Press `Ctrl+D` (or `Cmd+D` on Mac) while in a call to toggle debug information.

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## Support

- [LiveKit Documentation](https://docs.livekit.io)
- [LiveKit Community Slack](https://livekit.io/join-slack)
- [GitHub Issues](https://github.com/livekit/livekit/issues)

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.
