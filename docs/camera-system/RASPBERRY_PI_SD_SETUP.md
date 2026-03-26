# Bootable Raspberry Pi SD Card Setup (macOS)

Create a bootable SD card for your Raspberry Pi so it can run Linux and talk to cameras.

---

## Option A: Raspberry Pi Imager (recommended)

1. **Install Raspberry Pi Imager**
   - Download: https://www.raspberrypi.com/software/
   - Or install via Homebrew: `brew install --cask raspberry-pi-imager`

2. **Run the Imager**
   - Insert the SD card into your Mac.
   - Open Raspberry Pi Imager.
   - **Choose OS**: Pick **Raspberry Pi OS** (e.g. "Raspberry Pi OS (64-bit)" for most Pis).
   - **Choose Storage**: Select your SD card (it will show capacity; double-check the device name).
   - Click **Next** → **Yes** to confirm overwrite.
   - Enter your Mac password when prompted. Wait for the write to finish.

3. **Eject**
   - When done, use **Eject** in the Imager or in Finder before removing the SD card.

---

## Option B: Manual method (terminal)

Use this if you prefer the command line or already have an OS image (`.img`) file.

### 1. List disks and find the SD card

```bash
diskutil list
```

Look for your SD card by size (e.g. 32GB or 64GB). It will appear as something like `/dev/disk2` (not `disk2s1`). **Use the whole-disk device (e.g. disk2), not a partition.**

### 2. Unmount the SD card (replace N with your disk number)

```bash
diskutil unmountDisk /dev/diskN
```

Example: `diskutil unmountDisk /dev/disk2`

### 3. Write the image to the SD card

Download an image first, e.g. from https://www.raspberrypi.com/software/ (direct image links are on that page).

Then (replace `N` and the path to the image):

```bash
sudo dd if=/path/to/raspios-image.img of=/dev/rdiskN bs=4m status=progress
```

- Use **`rdiskN`** (e.g. `/dev/rdisk2`) for faster writes on macOS.
- **Double-check the disk number**; writing to the wrong disk will destroy data.

### 4. Eject when done

```bash
diskutil eject /dev/diskN
```

---

## After first boot (on the Pi)

1. Connect keyboard, monitor, and network (Ethernet or Wi‑Fi).
2. Boot the Pi; complete the initial setup (language, user, Wi‑Fi if needed).
3. Update the system:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
4. For camera work you may need:
   - **USB cameras**: often work with `v4l2`; install e.g. `v4l-utils`.
   - **Raspberry Pi Camera (CSI)**: enable in `sudo raspi-config` → Interface Options → Camera.
   - **Python**: `sudo apt install python3 python3-pip python3-venv`.

---

## Security notes

- **Never** use `dd` with a disk number you’re unsure about; you can overwrite your Mac’s disk.
- Always **eject** the SD card before unplugging it.

---

## Next steps for “Linux box talks to cameras”

- **Use this repo's Pi scripts:** See the project [README](../README.md). In `pi/` run `./setup_pi.sh`, then `python camera_discover.py` and `python capture_frame.py`.
- **SSH from your Mac:** `ssh pi@<pi-ip-address>` (default user is often `pi`; change the default password).
