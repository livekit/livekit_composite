#!/bin/bash

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)"
  exit 1
fi

# Get the absolute path to the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Copy service files to systemd directory
cp $SCRIPT_DIR/rover-cam-gstreamer.service /etc/systemd/system/
cp $SCRIPT_DIR/rover-cam-publish.service /etc/systemd/system/
cp $SCRIPT_DIR/rover-control.service /etc/systemd/system/

# Reload systemd daemon
systemctl daemon-reload

# Enable services to start at boot
systemctl enable rover-cam-gstreamer.service
systemctl enable rover-cam-publish.service
systemctl enable rover-control.service

echo "Services installed and enabled. You can now start them with:"
echo "sudo systemctl start rover-cam-gstreamer.service"
echo "sudo systemctl start rover-cam-publish.service"
echo "sudo systemctl start rover-control.service"
echo ""
echo "To check status use: sudo systemctl status <service-name>"
echo ""
echo "IMPORTANT: Make sure to edit /home/pi/rover-teleop/rover/.env with your LiveKit credentials." 