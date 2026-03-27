"""
Pytest configuration.
Adds the pi/ directory to sys.path so tests can import modules directly.
"""

import os
import sys
import tempfile
from pathlib import Path

_pi_root = Path(__file__).resolve().parent.parent
_camera_system_root = _pi_root.parent
sys.path.insert(0, str(_pi_root))
sys.path.insert(0, str(_camera_system_root))

# trigger_server imports UploadQueue() at module load; defaults use /data/tunnel (writable only on Pi).
_test_data = Path(tempfile.gettempdir()) / "tunnel-pi-pytest"
_test_data.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("UPLOAD_QUEUE_DB", str(_test_data / "queue.db"))
os.environ.setdefault("LOCAL_STORAGE_PATH", str(_test_data / "images"))
