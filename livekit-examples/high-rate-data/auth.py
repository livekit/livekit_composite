import os
from dotenv import load_dotenv
from livekit import api

# Load environment variables from .env file
load_dotenv()

# Get LiveKit credentials from environment variables
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET")

def generate_token(room_name, identity=None, name=None):
    """
    Generate a LiveKit access token for room access.
    
    Args:
        room_name: The name of the room to join
        identity: The participant identity
        name: The display name (default: same as identity)
    
    Returns:
        JWT token string
    """
    if not identity:
        identity = f"python-user-{room_name}"
    
    if not name:
        name = identity
        
    # Check if required environment variables are set
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise ValueError("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in .env file")
    
    # Create token with video grants
    token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(name)
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
            )
        )
        .to_jwt()
    )
    
    return token 