<a href="https://livekit.io/">
  <img src="./.github/assets/livekit-mark.png" alt="LiveKit logo" width="100" height="100">
</a>

# Node Token Server

<p>
  <a href="https://cloud.livekit.io/projects/p_/sandbox"><strong>Deploy a sandbox app</strong></a>
  •
  <a href="https://docs.livekit.io">LiveKit Docs</a>
  •
  <a href="https://livekit.io/cloud">LiveKit Cloud</a>
  •
  <a href="https://blog.livekit.io/">Blog</a>
</p>

A basic LiveKit token server using Node + TypeScipt. For details on generating tokens, see our [documentation](https://docs.livekit.io/home/server/generating-tokens).

## Dev Setup

Clone the repository and install dependencies:

```console
cd token-server-node
pnpm install
```

Set up the environment by copying `.env.example` to `.env.local` and filling in the required values:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

You can also do this automatically using the LiveKit CLI:

```bash
lk app env
```

Build and run the server:

```console
pnpm build && pnpm start
```
