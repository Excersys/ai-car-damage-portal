#!/usr/bin/env bash
# setup_pi.sh — Run on Raspberry Pi OS to install deps and Python env for camera scripts.
# Usage: ./setup_pi.sh   (from the pi/ directory or project root)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Updating package list ==="
sudo apt-get update -qq

echo "=== Installing system dependencies ==="
sudo apt-get install -y \
  python3 \
  python3-pip \
  python3-venv \
  v4l-utils \
  libopencv-dev

echo "=== Creating virtualenv and installing Python deps ==="
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

# Optional: CSI camera support (uncomment if using Raspberry Pi Camera Module)
# .venv/bin/pip install picamera2

echo "=== Done ==="
echo "Activate with: source pi/.venv/bin/activate"
echo "Discover cameras: python camera_discover.py"
echo "Capture a frame:  python capture_frame.py [output.png]"
