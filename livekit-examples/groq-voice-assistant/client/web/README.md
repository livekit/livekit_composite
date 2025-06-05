# Groq Voice Agent Web Client

A Next.js web application that provides real-time voice communication capabilities using LiveKit.

## Prerequisites

- Node.js (version compatible with Next.js 14)
- pnpm (recommended), npm, or yarn
- LiveKit server (either cloud-hosted or self-hosted) and credentials

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your LiveKit credentials:
     - `LIVEKIT_API_KEY`
     - `LIVEKIT_API_SECRET`
     - `LIVEKIT_URL`

## Development

Run the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Technologies

- Next.js 14
- React 18
- LiveKit for real-time communication
- TypeScript
- TailwindCSS for styling
