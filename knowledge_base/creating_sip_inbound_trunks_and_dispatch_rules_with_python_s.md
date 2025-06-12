# Creating SIP Inbound Trunks and Dispatch Rules with Python SDK

This guide demonstrates how to programmatically manage SIP resources using the LiveKit Python API, including creating inbound trunks and dispatch rules.


## Prerequisites


- LiveKit Python SDK installed
- LiveKit API credentials (URL, API key, and secret)
- Phone numbers configured for your SIP trunk


## Implementation

Here's a complete example showing how to manage SIP resources using an async function:


```

async def manage_sip_resources() -> None:
    # Initialize LiveKit API client
    lk_api = LiveKitAPI(
        url=livekit_url,
        api_key=livekit_api_key,
        api_secret=livekit_api_secret,
    )

    # Clean up existing resources
    # Remove existing dispatch rules
    existing_rules = await lk_api.sip.list_sip_dispatch_rule(
        ListSIPDispatchRuleRequest()
    )
    for rule in existing_rules.items:
        await lk_api.sip.delete_sip_dispatch_rule(
            DeleteSIPDispatchRuleRequest(sip_dispatch_rule_id=rule.sip_dispatch_rule_id)
        )

    # Remove existing inbound trunks
    existing_trunks = await lk_api.sip.list_sip_inbound_trunk(
        ListSIPInboundTrunkRequest()
    )
    for trunk in existing_trunks.items:
        await lk_api.sip.delete_sip_trunk(
            DeleteSIPTrunkRequest(sip_trunk_id=trunk.sip_trunk_id)
        )

    # Create new inbound trunk
    inbound_trunk_request = CreateSIPInboundTrunkRequest(
        trunk=SIPInboundTrunkInfo(
            name="My Inbound Trunk",
            numbers=PHONE_NUMBERS,
            krisp_enabled=True,
        ),
    )
    inbound_trunk = await lk_api.sip.create_sip_inbound_trunk(inbound_trunk_request)

    # Create dispatch rule
    dispatch_rule_request = CreateSIPDispatchRuleRequest(
        trunk_ids=[inbound_trunk.sip_trunk_id],
        rule=SIPDispatchRule(
            dispatch_rule_individual=SIPDispatchRuleIndividual(room_prefix="call")
        ),
    )
    dispatch_rule = await lk_api.sip.create_sip_dispatch_rule(dispatch_rule_request)

```


## Function Overview

This function performs the following operations:


1. Initializes the LiveKit API client with your credentials
2. Cleans up existing resources by removing any existing dispatch rules and inbound trunks
3. Creates a new inbound trunk with specified phone numbers and Krisp noise cancellation enabled
4. Sets up a dispatch rule that routes incoming calls to rooms with the "call" prefix


## Important Notes


- Replace `PHONE_NUMBERS` with your list of phone numbers
- Ensure you have proper error handling in production code
- The function uses async/await syntax, so it must be called from an async context