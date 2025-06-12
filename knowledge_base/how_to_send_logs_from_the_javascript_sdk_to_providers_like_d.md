# How to Send Logs from the JavaScript SDK to Providers like Datadog

LiveKit JavaScript SDK's logging includes `setLogLevel` and `setLogExtension`. `setLogExtension()` adds a hook into the SDK's logging library that is called for every log line.


## Usage


```
setLogExtension((level: LogLevel, msg: string, context: object) => {
   // use your log provider's API to send this log message and context
});
```


## Examples

You can find an example [here](https://github. com/livekit-examples/meet/blob/efac802d7bd98878f2915b48672ef84a248061f1/lib/Debug. tsx#L25)


## Adding Room-Specific Context

Use the `setLogExtension` function to add custom context to your room logs:


```
setLogExtension((lvl, logmsg, ctx) => {
  if ('room' in ctx) {
    // Add room-specific context based on room name
    ctx = {...ctx, ...customLogContexts.get(ctx.room)};
  }
  // Continue forwarding with enhanced room-specific log context
});
```

**Note:** Initial connection logs won't include room context since they occur before the WebSocket connection is established. Room-specific context will be available for all subsequent logs once the room connection is established.


### Available Context Information

By default, all room-level logs include:


- Room name
- Room ID

You can extend this with your own custom context information using the method shown above.