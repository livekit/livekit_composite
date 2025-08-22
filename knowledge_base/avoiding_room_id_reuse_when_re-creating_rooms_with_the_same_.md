# Avoiding Room ID Reuse When Re-Creating Rooms With the Same Name

**Context**

In some LiveKit implementations, customers may open and close rooms with the **same room name** in rapid succession. This is common in applications where the room name is derived from a static value such as a user ID, and new meetings are created and torn down within seconds — for example, an internal live streaming or meeting tool.


### Problem

If you delete a room and then quickly create a new room **with the same name**, there is a chance that the **new room will reuse the same Room ID** as the one you just deleted.

This behavior is **non-deterministic** — sometimes the new room gets a new Room ID, other times it reuses the previous one. This can cause confusion when trying to guarantee that each meeting instance is unique.


### Why This Happens


- **Race condition:** When you call the `DeleteRoom` API, the request updates the database to mark the room as ended. If you immediately issue a `CreateRoom` request with the same name **before** the database update completes, the new request may see the previous room as still open and reuse its Room ID.
- **No explicit delete:** If no explicit `DeleteRoom` call is made, LiveKit’s auto-termination logic applies. Rooms auto-close after a **departure timeout** (default: 20 seconds) if there are no participants. Then a sweeper process finalizes cleanup, which can take **another 30–45 seconds**.
- **Database delays:** Occasionally, connectivity issues between nodes and the database can delay the `DeleteRoom`operation, leaving stale room state briefly visible to new create requests.


### Caveats


- If you reuse the same room name within **a short window** (under 30–60 seconds), there is no guarantee the system will generate a new Room ID.
- Relying on a static room name (like a user ID) **without any uniqueness** makes this more likely to occur.
- Rapid polling of endpoints like `ListParticipants` will not fix this issue and may add unnecessary load.


### Solutions

✅ **Recommended best practice:****Use a unique room name each time you create a new meeting.**You can still base it on your user ID, but add a unique suffix, such as:


- A timestamp
- A random string or UUID
- An incrementing counter

**Example:**Instead of:

`room_name = "user_12345"`

Use:

`room_name = "user_12345_20250724T081259Z"`

or

`room_name = "user_12345_ab12cd34"`

This guarantees that each `CreateRoom` request will always create a new, distinct room with a unique Room ID.


### Key Takeaway

**Do not reuse the same static room name for back-to-back meetings if you need a guaranteed unique Room ID each time.**Always add a unique element to the room name.


### Additional Notes


- If you **must** reuse the same name, allow at least **1–2 minutes** between deletion and recreation, to ensure cleanup completes.
- Do not “spam” `ListParticipants` or similar endpoints to work around this — it does not solve the underlying timing window.
- If you see unexpected reuse of Room IDs, check your logs for the timestamps of `DeleteRoom` and `CreateRoom` calls to confirm if they overlapped.


### Related APIs


- [CreateRoom](https://docs. livekit. io/reference/api#create-room)
- [DeleteRoom](https://docs. livekit. io/reference/api#delete-room)
- [ListParticipants](https://docs. livekit. io/reference/api#list-participants)