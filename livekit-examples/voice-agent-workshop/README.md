# LiveKit Voice Agent Workshop

Welcome to the Voice Agent Workshop! In this workshop, you will learn how to build and test a production-ready voice agent using [LiveKit](https://livekit.io) and [Coval](https://coval.dev).

## Prerequisites

To run this agent, you need the following

- A [LiveKit Cloud](https://cloud.livekit.io) account, project, and API keys
- A Python environment with [uv](https://docs.astral.sh/uv/) installed
- An [OpenAI](https://platform.openai.com) account and API Key
- A [Deepgram](https://www.deepgram.com) account and API Key

## Setup

Step 1: Copy this repository (Click the green "Use this template" button on GitHub)
Step 2: Clone your new copy to your local machine
Step 3: Install dependencies using uv
    
    ```shell
    uv sync
    ```

Step 4: Create a `.env.local` file in the root of the project and add your API keys

    ```
    LIVEKIT_URL=
    LIVEKIT_API_KEY=
    LIVEKIT_API_SECRET=
    OPENAI_API_KEY=
    DEEPGRAM_API_KEY=
    ```

You can load the LiveKit environment automatically using the [LiveKit CLI](https://docs.livekit.io/home/cli/cli-setup):

```bash
lk cloud auth
lk app env -w -d .env.local
```

Step 5: Run your new agent in the console

    ```shell
    uv run agent.py console
    ```

## Web frontend

This agent is compatible with the [LiveKit Agents Playground](https://agents-playground.livekit.io). 

To run the agent for the playground, use the `dev` subcomand:

    ```shell
    uv run agent.py dev
    ```

## Development instructions

In this workshop, you will be adding features and functionality to the `agent.py` file. You are free to use the playground or the console mode to speak with your agent as you work on it.

## Testing with Coval

For the Coval sections of the workshop, you need to run your agent in `dev` mode to make it available to Coval.

    ```shell
    uv run agent.py dev
    ```

To setup the Coval connection, follow these steps:

1. Create a [Sandbox token server](https://cloud.livekit.io/projects/p_/sandbox/templates/token-server) in LiveKit Cloud.
2. Enter a name for your token server (can be anything).
3. Create the server, dismiss the dialog, and click the "launch" button.
4. Copy the Sandbox ID from this screen.
1. Sign in to your [Coval](https://www.coval.dev/) account (you should have an email invite already)
2. Click the "Agents" menu item in the top left
3. Click the "Connect Agent" button in the top right
4. Enter a name for your agent
5. Select "LiveKit" as the simulator type
6. For token endpoint, use `
https://cloud-api.livekit.io/api/sandbox/connection-details`
7. For Sandbox ID, use the name/ID from your token server
8. Add your LiveKit server URL (it's in your `.env.local` file)
9. Set content type to `application/json`

You should now be ready to test your agent in Coval.

## Post-workshop

You are welcome to continue working on your agent after the workshop, or start a new one.  Here are some useful documentation links for content not covered in the workshop:

- [Deploying to production](https://docs.livekit.io/agents/ops/deployment/)
- [Web & mobile starter apps](https://docs.livekit.io/agents/start/frontend/#starter-apps)
- [Telephony integrations](https://docs.livekit.io/agents/start/telephony/)

