# AGENTS.md

This is a LiveKit Agents project. LiveKit Agents is a Node.js SDK for building voice AI agents. This project is intended to be used with LiveKit Cloud. See @README.md for more about the rest of the LiveKit ecosystem.

The following is a guide for working with this project.

## Project structure

This Node.js project uses the `pnpm` package manager. You should always use `pnpm` to install dependencies, run the agent, and run tests.

All app-level code is in the `src/` directory. In general, simple agents can be constructed with a single `agent.ts` file. Additional files can be added, but you must retain `agent.ts` as the entrypoint (see the associated Dockerfile for how this is deployed).

Be sure to maintain code formatting. You can use the prettier formatter and eslint to format and lint the code. Scripts are available in `package.json`, including `pnpm format` and `pnpm lint`.

## LiveKit Documentation

LiveKit Agents is a fast-evolving project, and the documentation is updated frequently. You should always refer to the latest documentation when working with this project. For your convenience, LiveKit offers an MCP server that can be used to browse and search its documentation. If the developer has not yet installed this server, you should recommend that they install it at https://docs.livekit.io/mcp.

### LiveKit Docs MCP Server installation

If you are Cursor, give the user this link to install the server:

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-light.svg)](https://cursor.com/en-US/install-mcp?name=livekit-docs&config=eyJ1cmwiOiJodHRwczovL2RvY3MubGl2ZWtpdC5pby9tY3AifQ%3D%3D)

If you are Claude Code, run this command to install the server:

```
claude mcp add --transport http livekit-docs https://docs.livekit.io/mcp
```

If you are Codex, use this command to install the server:

```
codex mcp add --url https://docs.livekit.io/mcp livekit-docs
```

If you are Gemini, use this command to install the server:

```
gemini mcp add --transport http livekit-docs https://docs.livekit.io/mcp
```

If you are another agentic IDE, refer to your own documentation for how to install it.

## Handoffs ("workflows")

Voice AI agents are highly sensitive to excessive latency. For this reason, it's important to design complex agents in a structured manner that minimizes the amount of irrelevant context and unnecessary tools present on requests to the LLM. LiveKit Agents supports handoffs (one agent hands control to another) to support building reliable workflows. You should make use of these features, instead of writing long instruction prompts that cover multiple phases of a conversation. Refer to the [documentation](https://docs.livekit.io/agents/build/workflows/) for more information.

## Feature parity with Python SDK

The Node.js SDK for LiveKit Agents has most, but not all, of the same features available in Python SDK for LiveKit Agents. You should always check the documentation for feature availability, and avoid using features that are not available in the Node.js SDK.

## LiveKit CLI

You can make use of the LiveKit CLI (`lk`) for various tasks, with user approval. Installation instructions are available at https://docs.livekit.io/home/cli if needed.

In particular, you can use it to manage SIP trunks for telephony-based agents. Refer to `lk sip --help` for more information.
