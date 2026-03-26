#!/usr/bin/env bash
# Simulate a motion sensor trigger against the Pi FastAPI server.
# Usage: ./simulate_trigger.sh [pi_host] [pi_port]
#
# Sends the same payload the Shelly Motion 2 sensor will send.
# Useful for testing the full pipeline without the physical sensor.

set -euo pipefail

PI_HOST="${1:-localhost}"
PI_PORT="${2:-8000}"
BASE_URL="http://${PI_HOST}:${PI_PORT}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "=== Tunnel Capture Simulation ==="
echo "Target: ${BASE_URL}"
echo ""

echo "1. Checking Pi health..."
curl -s "${BASE_URL}/health" | python3 -m json.tool
echo ""

echo "2. Listing cameras..."
curl -s "${BASE_URL}/cameras" | python3 -m json.tool
echo ""

echo "3. Sending trigger (simulating sensor)..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/trigger" \
  -H "Content-Type: application/json" \
  -d "{\"sensor_id\": \"simulated_sensor\", \"timestamp\": \"${TIMESTAMP}\"}")

echo "${RESPONSE}" | python3 -m json.tool
echo ""

EVENT_ID=$(echo "${RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin)['event_id'])" 2>/dev/null || echo "unknown")
echo "Event ID: ${EVENT_ID}"
echo ""

echo "4. Checking upload queue..."
curl -s "${BASE_URL}/queue/status" | python3 -m json.tool
echo ""

echo "=== Done ==="
