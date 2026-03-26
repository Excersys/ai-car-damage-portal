"""
Generate a self-contained HTML multi-angle car viewer with damage overlay.

Embeds all captured images as base64 inside a single HTML file that can be
opened in any browser — no server needed.

Features:
    - Camera tab selector (one tab per camera)
    - Frame slider/scrubber for each camera's burst sequence
    - Damage bounding boxes overlaid on frames where detections exist
    - Auto-play option to animate through frames
    - Event metadata sidebar
"""

from __future__ import annotations

import base64
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("tunnel-detect.viewer")


def _encode_image(path: Path) -> str:
    """Base64-encode a JPEG image for embedding in HTML."""
    data = path.read_bytes()
    return base64.b64encode(data).decode("ascii")


def _build_viewer_data(event_dir: Path, scan_dict: dict[str, Any]) -> dict:
    """Collect images and metadata into a structure for the HTML template."""
    cameras_data: dict[str, list[dict]] = {}
    cameras_section = scan_dict.get("cameras", {})

    for cam_id, frame_list in cameras_section.items():
        cam_frames = []
        for f in sorted(frame_list, key=lambda x: x["frame_index"]):
            fpath = Path(f["path"])
            if not fpath.exists():
                continue
            cam_frames.append({
                "index": f["frame_index"],
                "b64": _encode_image(fpath),
                "detections": f.get("detections", []),
                "timestamp": f.get("timestamp", ""),
            })
        if cam_frames:
            cameras_data[cam_id] = cam_frames

    return {
        "event_id": scan_dict.get("event_id", ""),
        "license_plate": scan_dict.get("license_plate", "unknown"),
        "start_time": scan_dict.get("start_time", ""),
        "end_time": scan_dict.get("end_time", ""),
        "total_frames": scan_dict.get("total_frames", 0),
        "cameras": cameras_data,
    }


_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vehicle Scan: {event_id}</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       background: #1a1a2e; color: #eee; }}
.header {{ background: #16213e; padding: 16px 24px; display: flex;
           justify-content: space-between; align-items: center; }}
.header h1 {{ font-size: 18px; font-weight: 600; }}
.meta {{ font-size: 13px; color: #8892b0; }}
.tabs {{ display: flex; gap: 4px; padding: 8px 24px; background: #0f3460; }}
.tab {{ padding: 8px 16px; border-radius: 6px 6px 0 0; cursor: pointer;
        background: transparent; border: none; color: #8892b0; font-size: 14px; }}
.tab.active {{ background: #1a1a2e; color: #64ffda; }}
.viewer {{ position: relative; max-width: 1200px; margin: 0 auto; padding: 16px; }}
.canvas-wrap {{ position: relative; width: 100%; background: #000; border-radius: 8px;
                overflow: hidden; }}
.canvas-wrap img {{ width: 100%; display: block; }}
.canvas-wrap canvas {{ position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                       pointer-events: none; }}
.controls {{ display: flex; align-items: center; gap: 12px; padding: 12px 0; }}
.controls input[type=range] {{ flex: 1; accent-color: #64ffda; }}
.controls button {{ background: #0f3460; border: 1px solid #64ffda; color: #64ffda;
                    padding: 6px 16px; border-radius: 4px; cursor: pointer; }}
.controls button:hover {{ background: #16213e; }}
.frame-info {{ font-size: 12px; color: #8892b0; min-width: 120px; text-align: right; }}
.detection-list {{ padding: 12px; background: #16213e; border-radius: 8px;
                   margin-top: 12px; font-size: 13px; }}
.detection-item {{ display: flex; gap: 12px; padding: 4px 0;
                   border-bottom: 1px solid #0f3460; }}
.det-type {{ color: #e94560; font-weight: 600; }}
.det-conf {{ color: #64ffda; }}
.no-det {{ color: #8892b0; font-style: italic; }}
</style>
</head>
<body>

<div class="header">
  <h1>Vehicle Scan: <span id="plate">{plate}</span></h1>
  <div class="meta">
    <div>Event: {event_id}</div>
    <div>Time: {start_time}</div>
    <div>Frames: {total_frames}</div>
  </div>
</div>

<div class="tabs" id="tabs"></div>

<div class="viewer">
  <div class="canvas-wrap">
    <img id="frame-img" src="" alt="frame">
    <canvas id="overlay"></canvas>
  </div>
  <div class="controls">
    <button id="play-btn" onclick="togglePlay()">Play</button>
    <input type="range" id="slider" min="0" value="0" oninput="showFrame(this.value)">
    <div class="frame-info" id="frame-info">Frame 0 / 0</div>
  </div>
  <div class="detection-list" id="det-list"></div>
</div>

<script>
const DATA = {json_data};
const camIds = Object.keys(DATA.cameras);
let currentCam = camIds[0] || '';
let playing = false;
let playTimer = null;

function initTabs() {{
  const tabs = document.getElementById('tabs');
  camIds.forEach(id => {{
    const btn = document.createElement('button');
    btn.className = 'tab' + (id === currentCam ? ' active' : '');
    btn.textContent = id;
    btn.onclick = () => switchCam(id);
    tabs.appendChild(btn);
  }});
}}

function switchCam(id) {{
  currentCam = id;
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.textContent === id));
  const frames = DATA.cameras[id] || [];
  document.getElementById('slider').max = Math.max(0, frames.length - 1);
  document.getElementById('slider').value = 0;
  showFrame(0);
}}

function showFrame(idx) {{
  const frames = DATA.cameras[currentCam] || [];
  if (!frames.length) return;
  idx = Math.max(0, Math.min(idx, frames.length - 1));
  const f = frames[idx];
  const img = document.getElementById('frame-img');
  img.src = 'data:image/jpeg;base64,' + f.b64;
  img.onload = () => drawOverlay(f.detections);
  document.getElementById('slider').value = idx;
  document.getElementById('frame-info').textContent =
    `Frame ${{idx + 1}} / ${{frames.length}}  ${{f.timestamp.split('T')[1]?.split('.')[0] || ''}}`;
  showDetections(f.detections);
}}

function drawOverlay(dets) {{
  const canvas = document.getElementById('overlay');
  const img = document.getElementById('frame-img');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  (dets || []).forEach(d => {{
    const [x1, y1, x2, y2] = d.bbox || [];
    if (x1 === undefined) return;
    ctx.strokeStyle = '#64ffda';
    ctx.lineWidth = 3;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.fillStyle = 'rgba(100, 255, 218, 0.15)';
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    const label = `${{d.class_name || d.damage_type || ''}} ${{(d.confidence * 100).toFixed(0)}}%`;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#64ffda';
    ctx.fillText(label, x1 + 4, y1 - 6);
  }});
}}

function showDetections(dets) {{
  const el = document.getElementById('det-list');
  if (!dets || !dets.length) {{
    el.innerHTML = '<div class="no-det">No detections in this frame</div>';
    return;
  }}
  el.innerHTML = dets.map(d =>
    `<div class="detection-item">
       <span class="det-type">${{d.class_name || d.damage_type || 'vehicle'}}</span>
       <span class="det-conf">${{(d.confidence * 100).toFixed(0)}}%</span>
       <span>[${{(d.bbox||[]).map(v => Math.round(v)).join(', ')}}]</span>
     </div>`
  ).join('');
}}

function togglePlay() {{
  playing = !playing;
  document.getElementById('play-btn').textContent = playing ? 'Pause' : 'Play';
  if (playing) {{
    playTimer = setInterval(() => {{
      const slider = document.getElementById('slider');
      let next = parseInt(slider.value) + 1;
      if (next > parseInt(slider.max)) next = 0;
      showFrame(next);
    }}, 500);
  }} else {{
    clearInterval(playTimer);
  }}
}}

initTabs();
if (currentCam) switchCam(currentCam);
</script>
</body>
</html>
"""


def generate_viewer(event_dir: Path, scan_dict: dict[str, Any]) -> Path | None:
    """
    Generate a self-contained HTML viewer for a scan event.

    Args:
        event_dir: Path to the scan event directory.
        scan_dict: Output of ScanEvent.to_dict().

    Returns:
        Path to the generated HTML file, or None if no images found.
    """
    viewer_data = _build_viewer_data(event_dir, scan_dict)
    if not viewer_data["cameras"]:
        logger.warning("No camera images found — skipping viewer generation")
        return None

    html = _HTML_TEMPLATE.format(
        event_id=viewer_data["event_id"],
        plate=viewer_data["license_plate"],
        start_time=viewer_data["start_time"],
        total_frames=viewer_data["total_frames"],
        json_data=json.dumps(viewer_data),
    )

    out_path = event_dir / "viewer.html"
    out_path.write_text(html)
    logger.info("Generated viewer: %s", out_path)
    return out_path
