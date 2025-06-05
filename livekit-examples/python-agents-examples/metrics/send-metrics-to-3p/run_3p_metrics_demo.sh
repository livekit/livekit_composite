#!/bin/bash

# Start the metrics server in the background
echo "Starting metrics server..."
cd metrics_server
python app.py &
SERVER_PID=$!
cd ..

# Wait for the server to start
echo "Waiting for metrics server to start..."
sleep 2

# Run the LiveKit agent
echo "Starting LiveKit agent..."
cd metrics
python send_metrics_to_3p.py console

# When the agent is stopped, also stop the server
echo "Stopping metrics server..."
kill $SERVER_PID 