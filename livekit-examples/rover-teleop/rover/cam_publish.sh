#!/bin/bash

# Load environment variables from .env file
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found. Please create it based on .env.example"
  exit 1
fi

# Check if required variables are set
if [ -z "$LIVEKIT_API_KEY" ] || [ -z "$LIVEKIT_API_SECRET" ] || [ -z "$LIVEKIT_URL" ]; then
  echo "Error: Required environment variables not set. Please check your .env file."
  echo "Required: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL"
  exit 1
fi


# Run the livekit-cli command with environment variables
lk room join --identity rover-cam --api-key "$LIVEKIT_API_KEY" \
  --api-secret "$LIVEKIT_API_SECRET" \
  --url "$LIVEKIT_URL" --publish h264://127.0.0.1:5004 $ROOM_NAME
