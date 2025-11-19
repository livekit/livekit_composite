# LiveKit Dev Day Demos

This repository collects the demos used for LiveKit Dev Day: end‑to‑end examples of voice agents, multi‑agent orchestration, teleoperation, and tool‑calling backends. Each demo has its own README with setup and architecture details; this index is meant to help you quickly explore what’s available.

## Voice + Telephony Scenarios

### `call-moderation`
Multi‑agent rideshare call center. A friendly driver agent (“Esteban”) handles inbound calls while a separate moderation agent silently monitors the conversation against LiveRide community guidelines. When policy violations are detected (threats, discrimination, destination‑before‑pickup, etc.), the moderator sends RPC alerts that the frontend surfaces as safety banners.

Key pieces:
- `driver-agent` – primary voice agent that greets riders, insists on knowing the destination, and dispatches the moderation worker into the room.
- `moderation-agent` – no‑TTS compliance agent that subscribes only to the driver’s audio, applies `guidelines.md`, and emits `moderation.show_violation` RPCs.
- `frontend` – Next.js “Hail Ride Dispatch” console for supervisors to monitor calls and see moderation alerts in real time.

### `call-queue`
Lightweight call‑center queue with post‑call surveys. A dispatcher dashboard lists active rooms, and a survey agent interviews callers after each call, pushing their answers into LiveKit room metadata so you can watch completion progress per caller.

Key pieces:
- `survey-agent` – Python voice agent that asks five scripted CSAT questions, calls a `record_survey_response` tool, and writes structured results back into room metadata.
- `frontend` – Next.js queue view that polls `/api/rooms`, decodes `survey.*` metadata fields, and shows “questions answered” progress pills for each room, plus a session view for active calls.

### `drive-thru`
Voice drive‑thru experience. A McDonald’s‑style attendant (“Kelly”) takes orders, manipulates a structured basket via tools (combo meals, happy meals, á‑la‑carte items), and triggers a checkout UI when the customer is done.

Key pieces:
- `drive-thru-agent` – LiveKit Agents worker with a rich fake menu, order‑management tools (`order_combo_meal`, `order_happy_meal`, `order_regular_item`, etc.), and a `get_order_state` RPC for UI integration.
- `frontend` – Next.js 15 app that connects to the same room, streams mic audio, renders an animated order board from `get_order_state`, and shows a checkout screen when the agent calls `complete_order`.

## Multi‑Agent / Model Comparison

### `model-battleground`
Model comparison “battleground” for voice stacks. Three separate agents, each with a different STT/LLM/TTS vendor combo, join the same LiveKit room and stream metrics + transcripts to a dashboard. You can dispatch Agents 2 and 3 on demand and watch how their latencies compare while you talk.

Key pieces:
- `battleground-agent` – Agent 1 (baseline: AssemblyAI + GPT‑4.1‑mini + Inworld TTS). Exposes a `model_battleground.agent.dispatch` RPC that uses the Agent Dispatch API to spawn the other agents.
- `battleground-agent-2` – Agent 2 (Deepgram + Gemini + Cartesia) that emits metrics/status/transcript RPCs with `agent_id="agent-2"`.
- `battleground-agent-3` – Agent 3 (Deepgram + Moonshot + Rime) with the same RPC contracts, tagged `agent_id="agent-3"`.
- `frontend` – three‑column dashboard that listens for `model_battleground.agent.*` RPCs, shows per‑agent bar charts for STT/LLM/TTS latency, and routes transcripts/messages to the correct column.

### `exa-deep-researcher`
Voice‑controlled deep research agent built on EXA. The agent accepts natural language research requests, runs a multi‑stage EXA workflow (quick search → briefing → iterative subtopic research), compresses findings, and generates a cited markdown research report while streaming progress to the UI.

Highlights:
- Supervisor pattern that breaks topics into subtopics and loops until coverage is sufficient.
- Token‑aware compression of notes to stay within context limits.
- Real‑time RPC streaming of state, notes, and citations, plus rate‑limited spoken status updates.

## Teleoperation & Robotics

### `teleoperation`
Robot teleoperation demo. Streams multiple camera feeds (bay + arms) and telemetry into a 3D interface so operators can visualize joint angles, watch live video, and view LiDAR data in real time, all coordinated via LiveKit rooms and data channels.

Highlights:
- `LiveVideoFeed` components for each camera track with live/offline indicators.
- `RobotArm3D` and joint‑position graphs that animate right/left arm joints (J1–J6) and status (“active”, “inactive”, “error”, “offline”) from data messages.
- `src/app/api/*` routes (`create_stream`, `join_stream`, `video-token`, `lidar-token`, `invite_to_stage`, etc.) that wrap LiveKit’s Room Service and Ingress APIs for stream lifecycle and stage/hand‑raising control.

## Tool‑Calling Backend

### `todo-app`
Backend for the Agent Builder Todo example. Provides a simple HTTP API that agents can call to store and manipulate todos instead of faking state in memory.

Highlights:
- Sinatra + ActiveRecord API in `todo-api/` with:
  - `POST /users/create` to mint a short `username` per session.
  - CRUD endpoints on `/todos/:username` for creating, listing, updating, and deleting todos.
- JSON responses shaped for tools/functions (ids, titles, descriptions, `completed` flag, timestamps) and clear error codes for validation and “not found” cases.

## Exploring further

- Each subdirectory listed above has its own README with detailed setup instructions, architecture notes, and customization ideas.
- Agents are implemented in Python using LiveKit Agents; frontends are mostly Next.js apps using the LiveKit JS/React SDKs.
- When you’re ready to run one, start from the sub‑README, then wire it into LiveKit Cloud (or self‑hosted) using the documented `LIVEKIT_*` environment variables.***
