# Agents Chatbot
This is an example client (forked from [https://chat.vercel.ai/](https://chat.vercel.ai/) and server-side LiveKit agent that uses data channels instead of HTTP streaming for transferring chat data back and forth.

## Run the agent

1. `cd server`
2. `cp .env.example .env`
3. populate real values in `.env`
4. `python -m venv .venv`
5. `pip install -r requirements.txt`
6. `python agent.py start`

## Run the NextJS app

NOTE: if you run into issues running `pnpm` commands because of a version mismatch, run the following first:
`export COREPACK_ENABLE_STRICT=0`

1. `cd client`
2. `cp .env.example .env.local`
3. populate real values in `.env.local`
4. `pnpm i` 
5. `pnpm dev`
6. navigate to `localhost:3000`
