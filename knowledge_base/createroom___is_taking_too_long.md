# CreateRoom() is Taking Too Long

### Problem

You're noticing that the `CreateRoom()` API is taking longer than expected to respond.


### Why This Happens

The `CreateRoom()` call performs a cross-region synchronization to ensure consistent room state across the entire deployment. This coordination introduces latency—especially noticeable in multi-region environments.


### Resolution

In most use cases, it's not necessary to call `CreateRoom()` explicitly. There are two recommended changes that can improve performance:


1. **Let the room be auto-created on participant join**LiveKit will automatically create a room when a participant joins using a valid token. This is the most efficient path and avoids unnecessary API calls and cross-region delays.
2. **Start egress without waiting for room creation**Your egress agent doesn't need to wait on `CreateRoom()`. Instead, initiate the egress operation directly—LiveKit will handle room creation on join if it hasn't already occurred.


### Summary

Avoiding explicit `CreateRoom()` calls speeds up your workflows and simplifies client logic. Let room creation happen implicitly and start downstream operations (like egress) without delay.