# Preserving Caller ID During SIP Transfers in LiveKit Agents

## Overview

When performing a **SIP transfer** in LiveKit using TransferSIPParticipantRequest or CreateSIPParticipantRequest, the **caller ID (from number)** may default to the **previous agent’s number** instead of the **original caller’s number**.

This can be problematic in **cold transfers** and **warm transfers**, where the receiving agent needs to see the **actual caller’s phone number**.

Fortunately, you can preserve the original caller ID by passing it explicitly to the SIP request.


## Solution

To preserve and pass the **original caller’s phone number**, set the **sip_number** field to the **original from_number** when making the CreateSIPParticipantRequest.


### Example (Python Agent)


```
create_request = api.CreateSIPParticipantRequest(
    sip_trunk_id=sip_trunk_id,
    sip_call_to=target_phone_number,
    sip_number=original_from_number,   # <- Pass the original caller ID here
    room_name=room_name,
    participant_identity=supervisor_identity,
    play_dialtone=True,
    hide_phone_number=False,
    krisp_enabled=True,
    wait_until_answered=True,
)
```


## Parameters Explained


- **sip_number**: This field determines what caller ID will be presented to the receiving party. By default, it may show the transferring agent’s number. Overriding it with the **original caller’s number** ensures the correct caller ID is displayed.
- **sip_call_to**: The destination phone number for the transfer.
- **sip_trunk_id**: The trunk to use for the outbound call.
- **room_name**: The LiveKit room associated with the session.
- **participant_identity**: Identity for the new SIP participant.
- **play_dialtone**, **hide_phone_number**, **krisp_enabled**, **wait_until_answered**: Optional flags for call behavior.


## Notes & Considerations


> **Note:** Ensure that your **SIP trunk provider** allows **arbitrary caller ID (ANI) passthrough**. Some providers may restrict the caller ID to verified numbers.


- Ensure that your **SIP trunk provider** allows **arbitrary caller ID (ANI) passthrough**. Some providers may restrict the caller ID to verified numbers.
- If the SIP provider blocks unverified caller IDs, the call may fail or still show the trunk’s default caller ID.
- For **warm transfers**, the same approach applies — pass the original_from_number into the sip_number field when initiating the new participant.


## Summary

To preserve the **original caller ID** during SIP transfers:


- Always set sip_number=original_from_number in CreateSIPParticipantRequest.
- Verify that your SIP trunk provider supports caller ID passthrough.

This ensures that the receiving agent sees the **true caller’s phone number** instead of the transferring agent’s number.