# Diagnosing Connection Errors with Connection Test Utility

If users are experiencing connectivity problems with LiveKit Cloud (e. g., seeing errors such as `could not establish pc connection`), you can use the Connection Test utility to help diagnose and troubleshoot the issue. This utility is available as a standalone tool on the [livekit. io](http://livekit. io) website at [https://livekit. io/connection-test](https://livekit. io/connection-test) or the tests can be run from a frontend using the underlying test [code in the client-sdk-js SDK](https://github. com/livekit/client-sdk-js/tree/main/src/connectionHelper).


## Running Connection Checks

You can choose how and when to run the connection checks. Here are a few options:


### On ConnectionError

First, if you are using LiveKit React Components, you can run connection checks as part of your error handling in `LiveKitRoom` implementation:


```
<LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        onError={(e: Error) => {
            if (e instanceof ConnectionError) {
              // run connection checks here
            }
          }}
      >
...
</LiveKitRoom>
```


### Available Tests


- WebRTC connectivity ( [source](https://github. com/livekit/client-sdk-js/blob/main/src/connectionHelper/checks/webrtc. ts) | [ConnectionCheck. checkWebRTC()](https://github. com/livekit/client-sdk-js/blob/52e207cea1d9637f50703d4013deaa8f43506a47/src/connectionHelper/ConnectionCheck. ts#L72-L74))Verifies a WebRTC connection to the LiveKit servers can be made successfully
- Websocket connectivity ( [source](https://github. com/livekit/client-sdk-js/blob/main/src/connectionHelper/checks/websocket. ts) | [ConnectionCheck. checkWebsocket()](https://github. com/livekit/client-sdk-js/blob/52e207cea1d9637f50703d4013deaa8f43506a47/src/connectionHelper/ConnectionCheck. ts#L68-L70))Verifies a Websocket connection to the LiveKit servers can be established successfully
- TURN ( [source](https://github. com/livekit/client-sdk-js/blob/main/src/connectionHelper/checks/turn. ts) | [ConnectionCheck. checkTURN()](https://github. com/livekit/client-sdk-js/blob/52e207cea1d9637f50703d4013deaa8f43506a47/src/connectionHelper/ConnectionCheck. ts#L76-L78))Verifies a connection to the LiveKit servers using TURN is successful
- Reconnect ( [source](https://github. com/livekit/client-sdk-js/blob/main/src/connectionHelper/checks/reconnect. ts) | [ConnectionCheck. checkReconnect()](https://github. com/livekit/client-sdk-js/blob/52e207cea1d9637f50703d4013deaa8f43506a47/src/connectionHelper/ConnectionCheck. ts#L80-L82))Verifies a connection can be resumed after interruption
- Publish Audio ( [source](https://github. com/livekit/client-sdk-js/blob/main/src/connectionHelper/checks/publishAudio. ts) | [ConnectionCheck. checkPublishAudio()](https://github. com/livekit/client-sdk-js/blob/52e207cea1d9637f50703d4013deaa8f43506a47/src/connectionHelper/ConnectionCheck. ts#L84-L86))Verifies audio frames from the microphone device can be retrieved and published to the LiveKit servers
- Publish Video ( [source](https://github. com/livekit/client-sdk-js/blob/main/src/connectionHelper/checks/publishVideo. ts) | [ConnectionCheck. checkPublishVideo()](https://github. com/livekit/client-sdk-js/blob/52e207cea1d9637f50703d4013deaa8f43506a47/src/connectionHelper/ConnectionCheck. ts#L88-L90))Verifies video frames from the camera device can be retrieved and published to the LiveKit servers
- Connection protocol ( [source](https://github. com/livekit/client-sdk-js/blob/main/src/connectionHelper/checks/connectionProtocol. ts) | [ConnectionCheck. checkConnectionProtocol()](https://github. com/livekit/client-sdk-js/blob/52e207cea1d9637f50703d4013deaa8f43506a47/src/connectionHelper/ConnectionCheck. ts#L92-L99))Compares TCP with UDP connectivity
- Cloud Region ( [source](https://github. com/livekit/client-sdk-js/blob/main/src/connectionHelper/checks/cloudRegion. ts) | [ConnectionCheck. checkCloudRegion()](https://github. com/livekit/client-sdk-js/blob/52e207cea1d9637f50703d4013deaa8f43506a47/src/connectionHelper/ConnectionCheck. ts#L101-L104))Checks the connections quality of closest Cloud regions and determines which of the connections is the best quality


## Best Practices

To properly diagnose connection issues, you should run three essential checks at a minimum:


- WebSocket connectivity
- WebRTC connectivity
- TURN server connectivity

**Important:** Create a separate LiveKit project for running these checks to avoid cluttering your production environment. Contact support to have this test project connected to your main account for billing purposes.


## Implementation Example


```

import { ConnectionCheck } from '@livekit/client-sdk';

const checker = new ConnectionCheck({
  url: 'your-project-url',
  token: 'your-token'
});

// Run individual checks
const websocketResult = await checker.checkWebsocket();
const webrtcResult = await checker.checkWebRTC();
const turnResult = await checker.checkTURN();

// Check results
if (websocketResult.status === 'FAILED' && 
    webrtcResult.status === 'FAILED' && 
    turnResult.status === 'FAILED') {
  // Very likely a firewall/VPN issue
}

```


## Interpreting Results

If all connection checks fail, this strongly indicates that the user's network (likely firewall or VPN) is blocking the necessary connections. In such cases, the user should:


- Check their firewall settings
- Disable VPN temporarily to test connectivity
- Contact their IT department to allow LiveKit connections