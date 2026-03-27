# Sprint QA checklist — tunnel / Pi (Raspberry Pi in hand)

Use this when you have the Pi on the bench with cameras (or acceptable substitutes). It maps the **current open Jira sprint** items to concrete checks. Tick boxes as you go; note the date and git SHA you tested.

**Jira board:** [ACR board](https://excersys.atlassian.net/jira/software/c/projects/ACR/boards/324)  
**Sprint tickets covered:** [ACR-129](https://excersys.atlassian.net/browse/ACR-129), [ACR-130](https://excersys.atlassian.net/browse/ACR-130), [ACR-131](https://excersys.atlassian.net/browse/ACR-131), [ACR-133](https://excersys.atlassian.net/browse/ACR-133), [ACR-155](https://excersys.atlassian.net/browse/ACR-155), [ACR-156](https://excersys.atlassian.net/browse/ACR-156), [ACR-159](https://excersys.atlassian.net/browse/ACR-159)

**Related docs:**

- Full install: [PI_DEPLOYMENT.md](PI_DEPLOYMENT.md)
- Env template: [tunnel-detect.env.example](tunnel-detect.env.example)
- Camera / RTSP: [NETWORK_CAMERAS.md](NETWORK_CAMERAS.md)

---

## 0. Prerequisites (before touching the Pi)

| Item | Notes |
|------|--------|
| Repo revision | `git log -1 --oneline` (record below) |
| AWS | Pi has valid creds (`aws sts get-caller-identity`); `S3_BUCKET` matches CDK tunnel bucket |
| DynamoDB / Lambda | Stack deployed; damage-detection Lambda wired to `scans/` prefix on that bucket |
| ONNX on Pi | `yolov8n.onnx` present under `camera-system/model/` (see PI_DEPLOYMENT §1) |
| Network | Pi reaches cameras (or you accept degraded `cameras_discovered`) and reaches AWS |

**Tested revision:** ________________________

---

## 1. Bring-up and systemd (ACR-131)

Follow [PI_DEPLOYMENT.md](PI_DEPLOYMENT.md) through §6 (health check). Then confirm:

| Step | Pass |
|------|------|
| `/etc/tunnel-detect/tunnel-detect.env` exists, mode `600`, matches your bucket/region | ☐ |
| `tunnel-detect.service` installed; after `daemon-reload`, unit matches repo (`EnvironmentFile=`, `WorkingDirectory=model`, writable `/data/tunnel`) | ☐ |
| `sudo systemctl is-active tunnel-trigger tunnel-detect` → both `active` | ☐ |
| `curl -s http://localhost:8000/health \| jq .` → `status` ok, `s3_connectivity` true when online | ☐ |
| `curl -s http://localhost:8000/cameras \| jq length` → matches expectation (≥1 if RTSP configured) | ☐ |
| Optional: credential rotation drill — change env, restart both units, health still good | ☐ |

---

## 2. S3 key shape and Lambda trigger (ACR-129)

**Goal:** New objects land under **`scans/...`** so inference runs once per uploaded frame.

| Step | Pass |
|------|------|
| After any successful upload, list one new key in S3: `aws s3 ls "s3://$S3_BUCKET/scans/" --recursive \| tail` | ☐ |
| Key matches expected layout: `scans/{plate_or_unknown}/{event_id}/{camera_id}/frame_XXXX.jpg` (see PI_DEPLOYMENT §6) | ☐ |
| No stray top-level prefixes for production traffic (e.g. legacy non-`scans/` paths) unless you explicitly still support them | ☐ |

---

## 3. Plate segment in key (ACR-156)

**Goal:** Keys are not stuck on `unknown` when plate OCR or static plate is configured.

| Step | Pass |
|------|------|
| Set `TUNNEL_LICENSE_PLATE` to a test value (e.g. `TESTPLATE`), trigger capture, confirm S3 path contains normalized segment | ☐ |
| If testing OCR: set `PI_PLATE_OCR=1` with deps installed; trigger with a readable plate in view; confirm key uses read value or fallback | ☐ |
| If OCR off and no static plate, `unknown` in path is acceptable — note behavior | ☐ |

---

## 4. Unified upload queue (ACR-155, ACR-130)

**Goal:** `detect_daemon` enqueues; `tunnel-trigger`’s worker drains **one** shared `UPLOAD_QUEUE_DB`.

| Step | Pass |
|------|------|
| In `tunnel-detect.env`: `USE_UPLOAD_QUEUE=1` and same `UPLOAD_QUEUE_DB` path documented on both units (see PI_DEPLOYMENT §6 unified pipeline) | ☐ |
| Baseline: `curl -s http://localhost:8000/queue/status \| jq .` → note `pending` | ☐ |
| Cause RTSP burst (real vehicle or staged motion) so daemon enqueues; `pending` may rise then fall as worker drains | ☐ |
| Run HTTP path: from laptop, `camera-system/scripts/simulate_trigger.sh <pi-ip> 8000` (or `curl` POST `/trigger`) | ☐ |
| Watch logs: `journalctl -u tunnel-trigger -f` and `journalctl -u tunnel-detect -f` — no unbounded error spam; worker progresses | ☐ |
| **ACR-130 / correlation:** In logs, find lines tied to one `event_id` across trigger + worker (request/event id in structured log if present) | ☐ |
| **ACR-130 / dead-letter:** If you can simulate repeated upload failure (wrong bucket temporarily), after max retries rows may land in dead-letter state — inspect with PI_DEPLOYMENT troubleshooting SQLite snippet; restore config and confirm queue recovers | ☐ |

---

## 5. RTSP detection daemon (sanity)

| Step | Pass |
|------|------|
| `journalctl -u tunnel-detect -n 80 --no-pager` — no repeated ONNX “file not found”; YOLO loads | ☐ |
| On vehicle / test pattern, burst captures fire and S3 (or queue) receives work | ☐ |
| Rollback check (optional): set `USE_UPLOAD_QUEUE=0` **only on daemon** per PI_DEPLOYMENT, restart, confirm legacy path still uploads if required | ☐ |

---

## 6. Multi-frame DynamoDB + Review API (ACR-133)

**On Pi + AWS (conceptual):** One `event_id` with several frames must produce **several** DynamoDB items (sort key `camera_frame` = `{camera_id}#{frame}`), and the Review API must return **all** rows for that event (pagination safe).

| Step | Pass |
|------|------|
| From S3 or app logs, pick a real `event_id` with multiple `frame_*.jpg` under one camera | ☐ |
| AWS Console or CLI: `query` partition key `event_id` on `tunnel_damage_events` — item count equals frame count | ☐ |
| Call Review API: `GET .../events/{event_id}` — `frames` length matches DynamoDB rows; ordering sensible | ☐ |
| No duplicate sort keys stomping prior frames (different `camera_frame` per frame) | ☐ |

---

## 7. Laptop: E2E script + cleanup (ACR-159)

Run from a machine with AWS credentials (not necessarily the Pi):

```bash
cd camera-system/scripts
export AWS_REGION=us-east-1
export S3_BUCKET=tunnel-images-<your-account-id>
export DYNAMODB_TABLE=tunnel_damage_events
# Optional: provide a real JPEG path
python3 test_pipeline_e2e.py /path/to/test.jpg
```

| Step | Pass |
|------|------|
| Script exits **0**; prints `E2E test PASSED` | ☐ |
| No `ValidationException` on cleanup delete (sort key must be `camera_frame`, not `camera_id`) | ☐ |
| S3 test object removed; DynamoDB test row removed | ☐ |

---

## 8. Sign-off

| Ticket | Result (pass / fail / N/A) | Notes |
|--------|---------------------------|--------|
| ACR-129 | | |
| ACR-130 | | |
| ACR-131 | | |
| ACR-133 | | |
| ACR-155 | | |
| ACR-156 | | |
| ACR-159 | | |

When everything you care about is **pass**, tell the team “sprint QA OK on Pi + AWS” and move tickets to **Done** per your [Jira lifecycle rule](../../.cursor/rules/jira-ticket-lifecycle.mdc).

---

## Quick reference — useful commands (on the Pi)

```bash
# Services
sudo systemctl status tunnel-trigger tunnel-detect
sudo journalctl -u tunnel-detect -f
sudo journalctl -u tunnel-trigger -f

# API
curl -s http://127.0.0.1:8000/health | jq .
curl -s http://127.0.0.1:8000/queue/status | jq .

# Simulate sensor (from another host)
./camera-system/scripts/simulate_trigger.sh <PI_IP> 8000
```
