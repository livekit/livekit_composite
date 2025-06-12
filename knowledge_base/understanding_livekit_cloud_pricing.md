# Understanding LiveKit Cloud Pricing

LiveKit Cloud pricing is usage-based. This guide breaks down the cost components of the pricing. For detailed pricing information, visit our [pricing page](https://livekit. io/pricing).


## Key Pricing Components


### 1. Connection Minutes


- Per participant minute (after the minutes included on your selected plan)
- Every [human or agent participant connected minute is counted](https://kb. livekit. io/articles/9085987274-what-participant-types-are-charged-connection-minutes) (i. e., ingress, egress, and SIP users are not charged for connection minutes)


### 2. Bandwidth Usage


- Per GB (after GB included with selected plan)
- Calculated based on outbound traffic to participants from LiveKit servers


### 3. Transcoding Minutes


- Per minute (after minutes included with selected plan)
- Applies to ingress and egress use cases


### 4. SIP Connection Minutes


- Only applicable for telephone participants


## Estimating Costs

The steps below provide a reasonable approach to estimating costs. However, this is not perfect and it is only meant to give you a rough guide to costs.


### Gather Inputs


1. Duration of a session in minutes,
2. Expected average bitrate in bits per second (bps), and
3. Number of participants
4. Selected plan from [LiveKit pricing page](https://livekit. io/pricing) so you can retrieve the various usage costs for the below calculations


### Estimate bandwidth costs

Estimating bandwidth requires several pieces of information:

Video:


- The resolution and size of the video displayed to the viewer(s) in the room
- The video encoding

Audio:


- The audio encoding

Participants:


- How many will be sharing audio and video?
- How many tiles will be visible on the viewers screen?

Once you have this information, estimate a bitrate (in bps) that each participant will receive from LiveKit.


> **Note:** **Pro Tip:** Verify your actual bitrate requirements using test broadcasts in your LiveKit Cloud project. Many scenarios can use lower bitrates while maintaining quality. See our [bitrate guide](https://livekit. io/webrtc/bitrate-guide) for recommendations.


1. Calculate bandwidth in GB sent to each participant on average for the session duration: You will only pay for the bandwidth sent to the participant from the LiveKit servers. Convert bitrate (bps) to Bytes per second (Bps)bitrate (Bps) = bitrate (bps) ÷ 8Calculate bandwidth in bytes used for the session durationBandwidth (Bytes) = bitrate (Bps) × duration (seconds)Convert to GBBandwidth (GB) = Bandwidth in Bytes / 1024 / 1024 / 1024
2. Calculate the total bandwidth for sessionTotal Bandwidth (GB) = Bandwidth (GB) × number of participants
3. Estimate the bandwidth cost**Bandwidth Cost** **= Total Bandwidth (GB) × cost per GB**


### Estimate connection minutes costs


1. Calculate the number of billable participantsNumber of billable participants = Sum the participants that are *not* ingress, egress, or SIP participant types
2. Estimate the connection minute cost**Connection Minutes Cost =** **Number of billable participants × Duration of session in minutes × cost per minute**


### Estimate Transcoding costs


1. Determine if you have any transcoding happening. This is required for most egress and ingress use cases. Transcoding is not required for: Most ingresses that use WHIP ( [*](https://docs. livekit. io/home/ingress/overview/#enabling-transcoding-for-whip-sessions))Egresses that use [Track egress](https://docs. livekit. io/home/egress/overview/#track-egress)
2. Calculate the minutes of transcodingFor room composite egresses, web egresses, and all ingresses: transcoding minutes = number of minutes the egress/ingress was in roomFor participant composite egresses: transcoding minutes = participant minutes
3. Estimate the transcoding costTranscoding cost = Transcoding minutes **×**cost of transcoding minute


### Estimate SIP costs


1. Determine if you have or will have any users dialing in via a phone using SIP
2. Calculate the number of SIP participants in the roomNumber of SIP participants = Sum of participants that are using SIP
3. Estimate the SIP minute cost:**SIP minutes cost = Number of SIP participants × Duration of session in minutes × cost per SIP minute**


> **Note:** **Note:** Both SIP minutes and Connection minutes are assuming all participants stay for the same length of time. However, in reality, this is usually not the case. If you want a more accurate estimate, you will need to sum of each participants' connected minutes for each