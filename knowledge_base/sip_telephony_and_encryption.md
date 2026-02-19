# SIP Telephony and Encryption

## Overview

This article explains how encryption works for SIP-based telephony calls in LiveKit, including where traffic is encrypted and how it differs from LiveKit's end-to-end encryption (E2EE) feature.


## Encryption Architecture


### SIP with Secure Trunking

When using SIP with secure trunking, the encryption flow works as follows:

**Key points:**

- **Traditional phone network**: The cellular portion of the call is not encrypted, as traditional phone networks don't guarantee encryption

- **Secure trunking (TLS/SRTP)**: Encryption is applied between your SIP trunk provider and LiveKit Cloud's SIP service

- **WebRTC**: Traffic is re-encrypted when leaving LiveKit Cloud to reach agents or other users


### LiveKit and Encryption

LiveKit Cloud's SIP server briefly decrypts audio to perform processing operations such as:

- **Krisp noise suppression**: Removes background noise from the audio stream

- **Transcoding**: Converts audio between different formats or codecs

After processing, the audio is immediately re-encrypted before being sent to the LiveKit room via WebRTC.


## How This Differs from End-to-End Encryption (E2EE)


### Standard End-to-end Encryption

LiveKit's standard E2EE feature looks like this:

With E2EE, media frames remain completely opaque to LiveKit Cloud throughout the entire journey.


### SIP Secure Trunking vs E2EE


## Summary

SIP secure trunking provides strong protection for telephony calls in transit, but differs from LiveKit's E2EE feature. Audio is encrypted during transmission but briefly decrypted within LiveKit Cloud for processing operations like noise suppression and transcoding. This architecture enables powerful server-side features while maintaining security for data in transit.