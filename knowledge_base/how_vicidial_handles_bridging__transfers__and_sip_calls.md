# How Vicidial Handles Bridging, Transfers, and SIP Calls

## Overview

When integrating with **Vicidial**, it’s important to understand how its SIP call flow works. Vicidial uses a **bridging**approach for connecting calls rather than true SIP transfers.


### Key Behaviors


- **Bridging Instead of Transfers:**Vicidial creates a **conference bridge** (a 3-way call) to connect parties. It does not perform a true SIP call transfer. Result: The Vicidial server remains in the media path as a **B2BUA (Back-to-Back User Agent)** between all parties on the call. Note: If you’re troubleshooting, you won’t see your server’s number directly when interacting with the agent — all signaling and media go through Vicidial.


- **Rejects PSTN Bridges:**Vicidial will reject attempts to bridge calls out to external phone numbers (PSTN). It typically returns a **SIP 603 “Decline”** response. This is usually due to a **policy restriction**, not a technical limitation — many setups block external bridging for security or billing reasons.


- **Requires SIP URI Destinations:**Vicidial only accepts calls to **SIP URIs** within its trusted network.**Authentication:** Your server’s IP address must be **whitelisted** on their side. It will only allow calls to SIP endpoints that are reachable using **IP authentication**, not username/password credentials.


### What This Means for You

✅ When designing an integration:


- Expect Vicidial to keep all calls anchored through its servers.
- Do not plan to bridge directly out to PSTN or external phone numbers via Vicidial — route those externally if needed.
- Make sure your SIP server is reachable using IP-based auth and is allowed on Vicidial’s trusted IP list.


### Summary