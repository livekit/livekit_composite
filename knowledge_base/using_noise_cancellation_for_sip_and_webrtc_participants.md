# Using Noise Cancellation for SIP and WebRTC Participants

# Problem

When building an agent that uses [noise cancellation](https://docs. livekit. io/home/cloud/noise-cancellation/#overview), support for participants who connect via SIP or standard WebRTC will differ. `BVC` works well for typical WebRTC audio, while `BVCTelephony` is optimized for narrower-band SIP audio.


# Solution

Add logic to select the appropriate filter based on the participant kind. For example:


```
participant = await ctx.wait_for_participant()
filter = noise_cancellation.BVC()
if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP:
  filter = noise_cancellation.BVCTelephony()
```

This ensures each participant gets the best noise cancellation for their connection type.


# References

[Noise Cancellation](https://docs. livekit. io/home/cloud/noise-cancellation/#overview)