# Livestream Mode

When using LiveKit's livestream mode, the system optimizes for large rooms by controlling which participant information gets broadcasted to all users in the room.


## Participant Types

In livestream mode, participants are divided into two types:


### Publishers

These participants have their information sent to all room participants. A user becomes a publisher when **either** of the following is true:


- User has published one or more tracks
- Metadata or attributes have been set on the user


### Viewers

These participants do not have any metadata, attributes, or published tracks. Their information is not sent to others to optimize performance in large rooms.


## Impact on Interactive Features

TBW


## Hook Behavior

React hooks work differently in livestream mode:


- `useRemoteParticipants` will work but will not include viewer participants
- `useLocalParticipant` works the same way for viewers


## Important Considerations

**Metadata Impact:** If you set metadata on every participant, their data will be sent to everyone even in livestream mode, as metadata typically contains important application information.

**Clearing Participant Data:** Once a participant's information starts being broadcasted, there's currently no way to stop it during the same session by clearing metadata, as the system would need to send updates to everyone to clear the already-set metadata.

**Scale Limitations:** The system can handle a few thousand users whose metadata needs to be synced. Performance issues typically occur when both conditions are met:


- Rooms larger than 5,000 visible participants
- Those participants are joining around the same time

For most use cases with interactive features like hand raising, the scale of active participants is typically much lower than total viewers, making this approach very effective for large livestream events.