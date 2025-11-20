# Teleoperation with LiveKit

This app is a teleoperation demo built on LiveKit. It streams multiple camera feeds and robot telemetry in real time to a 3D interface, so a remote operator can “sit inside” a robot bay: watching live video, visualizing joint angles, and monitoring arm status with sub‑second latency.

Built with [Next.js](https://nextjs.org/), [LiveKit Cloud](https://livekit.io/cloud), and the LiveKit Server SDK, it acts as both:

- a browser UI for operators (video feeds, LiDAR view, 3D arm), and  
- a backend API layer for managing LiveKit rooms, ingress, and participation state.

## What it shows

- **Multi-camera robot view**
  - `LiveVideoFeed` attaches `RemoteTrack`s from LiveKit rooms and displays them with status badges.
  - There are distinct video tracks for the robot bay, the right arm, and the left arm, each with its own “live/offline” state.
- **3D robot arm visualization**
  - `RobotArm3DWrapper` and `RobotArm3D` render a 3D arm whose joints are driven by positions received over LiveKit data.
  - Right and left arm joint angles are tracked separately, with color‑coded joints (J1–J6) and per‑joint status (“active”, “inactive”, “error”, “offline”).
- **Joint telemetry & graphs**
  - `joint-position-graph.tsx` (and related components) plot joint angles over time so you can see how the robot is moving at a glance.
  - The landing page keeps timestamps of the most recent update and marks the feed as “live” while telemetry is flowing.
- **LiDAR / sensor views**
  - The `lidar` route and `lidar-viewer.tsx` render a dedicated view that connects to a separate LiveKit room for LiDAR data, using a token from the `/api/lidar-token` endpoint.
- **Stage/hand-raising controls**
  - The sidebar includes presence/participation controls (raise hand, invite to stage, remove from stage) implemented through the backend controller and LiveKit room metadata.

## Backend API

Under `src/app/api/*`, the app exposes a small REST API that wraps LiveKit’s Room Service and Ingress APIs via `lib/controller.ts`:

- `POST /api/create_ingress` – create an RTMP/WHIP ingress plus a viewer token for OBS or other encoders.
- `POST /api/create_stream` – create a LiveKit room + access token for a new teleop stream.
- `POST /api/join_stream` – join an existing room as a viewer; returns a token and WebSocket URL.
- `POST /api/stop_stream` – end the stream by deleting the room (only the creator may do this).
- `POST /api/invite_to_stage` – mark a viewer as invited to stage; when combined with a raised hand, grants publish rights.
- `POST /api/remove_from_stage` – revoke stage status and unpublish a participant’s tracks.
- `POST /api/raise_hand` – toggle the `hand_raised` flag in participant metadata so the UI can show who wants control.
- `GET /api/video-token` – convenience endpoint that generates an anonymous viewer token for the `robot` room.
- `GET /api/lidar-token` – same pattern for a dedicated `lidar` room.

The `Controller` class:

- normalizes the LiveKit host from `NEXT_PUBLIC_LIVEKIT_WS_URL`,
- uses `RoomServiceClient` to create/delete rooms and update participants, and
- generates short JWT “session” tokens for the stage/hand APIs (`createAuthToken` / `getSessionFromReq`).

## How it fits together

1. The backend creates or joins LiveKit rooms for robot video and LiDAR, minting WebRTC access tokens for operators via the API routes.
2. A teleop pipeline publishes multiple video tracks (bay, right arm, left arm) plus data messages for joint angles and statuses.
3. The React UI connects to those rooms, subscribes to tracks, and:
   - renders the live video feeds,
   - feeds joint telemetry into the 3D arm and graphs,
   - updates joint state cards and health indicators.
4. Stage/hand‑raising controls use LiveKit participant metadata to coordinate who is allowed to publish control streams or speak.
