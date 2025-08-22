# WhatsApp Integration with LiveKit

Here at LiveKit we are actively working to add **direct support for WhatsApp’s new**[public release](https://developers. facebook. com/docs/whatsapp/cloud-api/calling) within LiveKit. This will allow customers to connect with WhatsApp users more seamlessly through **direct WebRTC access**.


## Current Status

While development is underway, we don’t have a specific timeline to share at this time. Our goal is to ensure a smooth integration that leverages LiveKit’s real-time media infrastructure to its fullest.


## SIP Support Considerations

For customers planning to use SIP as a bridge:


- WhatsApp calls rely on **Opus audio codec support**.
- LiveKit is planning to add native Opus support for SIP, enabling this pathway for integration.


## Short-Term Workaround

Until direct support is available, customers can use their own **SIP proxy** to bridge WhatsApp with LiveKit. This approach allows WhatsApp calls to be translated into a LiveKit-compatible SIP session, ensuring continued interoperability.


## Looking Ahead

Once completed, LiveKit will provide **direct WebRTC access for WhatsApp**, simplifying the integration and removing the need for a custom SIP proxy.