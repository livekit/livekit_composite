# LiveKit Realtime Room Monitor

The room diagnostic console we have all been wanting.

**Key Features:**

- Real-time logs of all events
- Full participant/room/tracks state visibility
- Ability to invoke server-side actions in real time
  - remove participants
  - update attributes
  - modify metadata
  - mute/unmute tracks
  - sending data packet with topic
  - and more...
- (WIP) Monitor and invoke RPC calls on the client/server (agent) side

![Screen Shot](res/realtime-room-console.gif)

**How To Use**

Hosted [here](https://v0-webq-gt7ld1dd0st.vercel.app/)

1. first run - click gear top right of screen
2. Set your LiveKit credentials and save
3. Now enter `Room Name` and `Observer ID` and click Start Observing
4. Click Connect

## How To Run Locally

See [agent-console/README.md](./agent-console/README.md)

## How to Observe the Log Events from a Simple Pipeline Agent

1. Run the `agent-console` frontend locally.

```bash
cd agent-console
npm i
npm run dev
```

2. Install `uv` package manager and run the pipeline agent locally.

```bash
pip install uv
```

3. Run the pipeline agent locally.

```bash
cd agent-examples
uv sync
make run-pipeline-agent
```

## **Extending & Customizing the Agent Console**

The codebase of the frontend is been made to encourage extensibility and customization for individual's own purposes.

If you are intended to build certain custom features that want the observable state of your own livekit application, here's the recommended approach:

### Extend New Views

Currently, the app has 4 main views:

1. **Room** - Monitor and manage the room state
2. **Local Participant** - Monitor and manage the local participant state and tracks
3. **Remote Participants** - Monitor and manage the remote participants' state and tracks
4. **Videos** - View the realtime stream of the videos

To extend the app with new views, you can do the following:

1. Inside `app/_components/livekit-state-tabs.tsx` file, add a new tab with the following code:

```tsx
<LivekitStateContent value="new-view">
  <div>New View</div>
</LivekitStateContent>
```

2. Make a new hook (or use existing ones) inside `hooks` folder, the hook should return the data that you want to display in the new view.

3. Use the prebuilt components `ObservableWrapper` inside `components/observable-wrapper.tsx` to display the data in the new view, and add as a child of the `LivekitStateContent` component. The `ObservableWrapper` component is a helper compoent that already handles displaying UI of the state as well as the underling state JSON data, and also has a toggle button to toggle between two views (JSON view and UI view).

So you should end up having something like this:

```tsx
const state = useMyCustomDataHook();

<ObservableWrapper title="View's Title" subtitle="View Subtitle" state={state}>
  {(state) => <MuCustomViewer {...state} />}
</ObservableWrapper>;
```

### Customize UI for logs

All the current log definitions are defined in `lib/event-definitions.ts` file. Each log event definition has the following types (defined in `lib/event-registry.ts`):

```ts
export interface EventDefinition<TData extends object> {
  level: WithCallable<TData, EventLevel>;
  source: WithCallable<TData, EventSource>;
  message: WithCallable<TData, string>;
  render: WithCallable<TData, React.ReactNode>;
}
```

For example, the `participantConnected` event definition is defined as follows:

```ts
export const eventRegistryConfig = {
  ..., // other event definitions
  participantConnected: defineEvent<{ participant: RemoteParticipant }>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ participant }) =>
      isAgent(participant)
        ? `An agent "${participant.identity}" has joined the room`
        : `A new remote participant "${participant.identity}" has joined the room`,
    render: ({ participant }) => renderJson({ participant }),
  }),
  ..., // other event definitions
}
```

Right now the detailed view of each event log is defaulted to `renderJson` function, which is a helper function to display the JSON data in a pretty way. You can customize the detailed view by overriding the `render` property to a custom component that you want to display.

You can also extend the set of event definitions by adding new ones in the `eventRegistryConfig` object in the `event-definitions.ts` file.

Right now all the livekit logs are automatically instrumented by the `LivekitEventInstrumentor` component inside `providers/livekit-event-instrumentor.tsx`. You can alwasy use the `useLogger` hook inside `hooks/use-logger.ts` to manually log new events to the console. For example, say you defined a new event type `myCustomEvent` in the eventRegistryConfig:

```ts
export const eventRegistryConfig = {
  ..., // other event definitions
  myCustomEvent: defineEvent<{ customData: string }>({
    level: ({ customData }) => (customData === "error" ? EventLevel.Error : EventLevel.Info),
    source: EventSource.Client,
    message: ({ customData }) => `My custom event: ${customData}`,
    render: ({ customData }) => <div>My custom event: {customData}</div>,
  }),
};
```

You can then log a new event to the console by calling the `useLogger` hook:

```ts
const { appendLog } = useLogger();

appendLog("myCustomEvent", { customData: "error" });
```

The object type schema of the data is automatically inferred by the event name.
