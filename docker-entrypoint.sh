#!/bin/bash
# Docker entrypoint script for EasyPanel GPU support
# This script ensures GPU devices are available before starting vllm

set -e

echo "Starting vllm with GPU support..."

# Check if GPU devices are available
if [ -e /dev/nvidia0 ] && [ -e /dev/nvidiactl ] && [ -e /dev/nvidia-uvm ]; then
    echo "GPU devices detected: /dev/nvidia0, /dev/nvidiactl, /dev/nvidia-uvm"
else
    echo "WARNING: GPU devices not found in container!"
    echo "Available devices:"
    ls -la /dev/nvidia* 2>/dev/null || echo "No nvidia devices found"
fi

# Execute vllm serve with all arguments
exec vllm serve "$@"
