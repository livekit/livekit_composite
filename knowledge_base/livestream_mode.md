# Livestream Mode

When using LiveKit's livestream mode, the system optimizes for large rooms by controlling which participant information gets broadcasted to all users in the room.


## Overview

Livestreaming Mode, also known as "skip-subscriber-broadcast", is needed for Livestream use cases where there is a room with:


- **> 1,000 subscriber participants**(the exact number is higher but this is a good threshold to use for the details outlined in this guide)
- a small number of hosts/publisher participants

In these cases, clients can get overwhelmed by all of the participant events. So, enabling this feature will disable all events of participants who are non-publishing (i. e., only subscribers).


## Participant Types

In livestream mode, participants are divided into two types:


### Publishers

These participants have their information sent to all room participants. A user becomes a publisher when **either** of the following is true:


- User has published one or more tracks
- Metadata or attributes have been set on the user


### Viewers

These participants have not set any metadata or attributes and are not publishing tracks.

Their information is not sent to others to optimize performance in large rooms.


## Impact on Interactive Features

After enabling this mode, there are a number of potential impacts to be aware of:


- **RemoteParticipants:** In the client SDK, Remote Participants will only contain publishersThe full list of participants will only be accessible from the server APIs.
- **Chat:** When using [chat components](https://docs. livekit. io/home/client/data/text-streams/#chat-components), the participant name will not be available (because remote participants are not populated). So, you will need to send the name of the sender encoded with the message. Most customers will send the message as a JSON object with the sender name + the message. For example:`{ "sender": { "username": "johndoe", "Full Name": "John Doe" }, "message": "Hello World!" }`This is just one example of the JSON format - you are welcome to use any format (or even use something other than JSON).
- **Subscriber Participant Events:** The SDK will not fire participant events (like participant join, etc.) for subscribers. If dependent on these events, please re-architect to avoid this dependency. Events will fire for publishers
- **React Hooks:** React hooks work differently in livestream mode:`useRemoteParticipants` will work but will not include viewer participants`useLocalParticipant` works the same way for viewers
- **Metadata Impact:** If you set metadata on a participant, that data will be sent to everyone even in livestream mode
- **Clearing Publisher Flag:** Once a participant's information starts being broadcasted, there's currently no way to stop it during the same session by clearing metadata, as the system would need to send updates to everyone to clear the already-set metadata.


# Workarounds


## Break up the large room into smaller rooms

If you need the participant events, one option is to split the room into multiple smaller rooms. The rooms should be < 500 participants.

If you do this approach, then you will also likely need a single large room with all participants where the livestream mode is enabled. i. e., you can use the large room for showing a video to everyone, where the smaller rooms will be for handling smaller interactions.