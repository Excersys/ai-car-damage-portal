#!/usr/bin/env bash
# list-sd-cards.sh — List disks so you can identify the SD card for imaging.
# Run on macOS with the SD card inserted. Use the disk number in dd/Imager.
# Usage: ./scripts/list-sd-cards.sh

set -e

echo "=== All disks (look for your SD by size, e.g. 32GB/64GB) ==="
diskutil list

echo ""
echo "=== External / removable media (often your SD card) ==="
diskutil list external

echo ""
echo "When using dd, use the whole disk (e.g. /dev/disk2), not a partition (e.g. disk2s1)."
echo "Unmount first: diskutil unmountDisk /dev/diskN"
echo "Then: sudo dd if=IMAGE.img of=/dev/rdiskN bs=4m status=progress"
