# Troubleshooting

## Cannot connect to LiveKit

**Symptoms**: Connection fails, timeout errors, or "Failed to connect" messages.

**Solutions**:
- Verify `LIVEKIT_URL` format: should start with `wss://` (not `https://`)
- Check firewall settings if using self-hosted LiveKit
- Ensure your LiveKit Cloud project is active
- Verify API key and secret are correct

## Agent not responding

**Symptoms**: Agent connects but doesn't speak or respond to input.

**Solutions**:
- Check `GOOGLE_API_KEY` is set correctly in agent environment
- Verify the model name: `gemini-2.5-flash-native-audio-preview-12-2025`
- Check agent logs: `lk agent logs <agent-name>`
- Ensure your Google API key has access to Gemini API
- Check API quota limits in Google Cloud Console

## No audio/video

**Symptoms**: No audio from agent, camera not working, or "Permission denied" errors.

**Solutions**:
- Grant browser permissions for microphone and camera when prompted
- Check browser console for permission errors
- Verify device selection in browser settings
- Test with a different browser (Chrome recommended)
- Check `supportsVideoInput` and `supportsScreenShare` in `app-config.ts`

## High latency

**Symptoms**: Delayed responses, noticeable lag between speech and response.

**Solutions**:
- Check your network connection quality
- Verify you're using a LiveKit region close to you
- Check Google API response times in Cloud Console
- Reduce video frame rate if using high FPS settings
- Consider using a faster model variant if available

## Token expired

**Symptoms**: "Token expired" or "Unauthorized" errors after some time.

**Solutions**:
- Tokens are generated server-side in `/api/connection-details`
- Check token expiration time in your token generation code
- Ensure token refresh logic is working in the frontend
- Verify `LIVEKIT_API_SECRET` is correct (used for token signing)

## Agent disconnects frequently

**Symptoms**: Agent session ends unexpectedly or reconnects repeatedly.

**Solutions**:
- Check agent resource limits in LiveKit Cloud
- Review agent logs for errors or crashes
- Verify network stability
- Check if agent is hitting rate limits (Google API or LiveKit)

## Frontend build errors

**Symptoms**: `pnpm build` fails or TypeScript errors.

**Solutions**:
- Run `pnpm install` to ensure dependencies are installed
- Check Node.js version (18+ required)
- Verify all environment variables are set
- Clear `.next` directory and rebuild: `rm -rf .next && pnpm build`

## Python agent errors

**Symptoms**: `python agent.py dev` fails or agent crashes.

**Solutions**:
- Verify Python version: `python --version` (should be 3.10-3.13)
- Install dependencies: `pip install -r requirements.txt`
- Check `.env.local` exists and has all required variables
- Verify virtual environment is activated if using one
- Check for import errors or missing packages
