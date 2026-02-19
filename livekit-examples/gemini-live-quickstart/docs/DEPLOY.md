# Deployment Guide

## Deploy agent to LiveKit Cloud

1. Create a LiveKit Cloud project at [cloud.livekit.io](https://cloud.livekit.io)

2. Install the LiveKit CLI if you haven't already:
   - macOS: `brew install livekit-cli`
   - Linux: `curl -sSL https://get.livekit.io/cli | bash`
   - Windows: `winget install LiveKit.LiveKitCLI`

3. Authenticate with LiveKit Cloud:
   ```bash
   lk login
   ```

4. Deploy your agent:
   ```bash
   cd agent
   lk agent deploy
   ```

5. After deployment, note the agent name. You'll use this in your frontend configuration.

## Deploy frontend to Vercel

### Option 1: Deploy button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Click the button above, connect your repository, and Vercel will automatically detect the Next.js configuration.

### Option 2: Manual deployment

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts to configure your project.

## Environment variables for production

### Agent environment variables

LiveKit Cloud automatically provides `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` when deploying with `lk agent deploy`.

You only need to set:

- `GOOGLE_API_KEY`: Your Google/Gemini API key

Set this during deployment with the `--secrets` flag or by using a `.env.local` file that the CLI will prompt you to load.

### Frontend environment variables

Set these in Vercel under your project's Environment Variables:

- `LIVEKIT_API_KEY`: Your LiveKit API key
- `LIVEKIT_API_SECRET`: Your LiveKit API secret
- `LIVEKIT_URL`: Your LiveKit server URL

**Important**: Never commit `.env.local` files to version control. Use your platform's environment variable management instead.

## Post-deployment

1. Update `frontend/app-config.ts` if needed:
   - Set `agentName` to your deployed agent name (if using named agents)
   - Update branding and configuration

2. Test the deployment:
   - Visit your Vercel URL
   - Start a session and verify the agent connects
   - Test video and audio functionality

3. Monitor your agent:
   - Check LiveKit Cloud dashboard for agent health
   - Monitor API usage in Google Cloud Console
   - Review Vercel logs for frontend issues
