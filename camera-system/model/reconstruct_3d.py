#!/usr/bin/env python3
"""
3D Gaussian Splatting reconstruction pipeline.

Processes burst-captured images from a vehicle scan into a 3D point cloud
that can be viewed in a web-based 3D viewer.

Pipeline:
    1. Collect images from the scan event directory
    2. Run COLMAP SfM for camera pose estimation
    3. Train 3D Gaussian Splatting model
    4. Export to .ply point cloud + web viewer

Intended to run on a cloud GPU instance (e.g. SageMaker Processing job
or g5.xlarge spot instance). Not for Pi execution.

Requirements (install on GPU instance):
    pip install gsplat nerfstudio torch torchvision
    apt install colmap

Usage:
    python reconstruct_3d.py /data/tunnel/events/scan_20260304_220228
    python reconstruct_3d.py --sagemaker s3://bucket/scans/ABC1234/scan_20260304_220228
"""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import subprocess
import sys
from pathlib import Path

logger = logging.getLogger("reconstruct-3d")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def collect_images(event_dir: Path) -> list[Path]:
    """Gather all frame images from a scan event directory."""
    images = sorted(event_dir.rglob("frame_*.jpg"))
    logger.info("Found %d images in %s", len(images), event_dir)
    return images


def prepare_colmap_workspace(images: list[Path], workspace: Path) -> Path:
    """Copy images into a COLMAP-compatible directory structure."""
    img_dir = workspace / "images"
    img_dir.mkdir(parents=True, exist_ok=True)

    for i, src in enumerate(images):
        cam_id = src.parent.name
        dst = img_dir / f"{cam_id}_{src.name}"
        shutil.copy2(src, dst)

    logger.info("Prepared %d images in %s", len(images), img_dir)
    return workspace


def run_colmap_sfm(workspace: Path) -> bool:
    """
    Run COLMAP Structure-from-Motion to estimate camera poses.

    Requires COLMAP installed on the system.
    """
    db_path = workspace / "database.db"
    img_dir = workspace / "images"
    sparse_dir = workspace / "sparse"
    sparse_dir.mkdir(exist_ok=True)

    steps = [
        {
            "name": "Feature extraction",
            "cmd": [
                "colmap", "feature_extractor",
                "--database_path", str(db_path),
                "--image_path", str(img_dir),
                "--ImageReader.single_camera", "0",
                "--SiftExtraction.use_gpu", "1",
            ],
        },
        {
            "name": "Feature matching",
            "cmd": [
                "colmap", "exhaustive_matcher",
                "--database_path", str(db_path),
                "--SiftMatching.use_gpu", "1",
            ],
        },
        {
            "name": "Sparse reconstruction",
            "cmd": [
                "colmap", "mapper",
                "--database_path", str(db_path),
                "--image_path", str(img_dir),
                "--output_path", str(sparse_dir),
            ],
        },
    ]

    for step in steps:
        logger.info("Running COLMAP: %s", step["name"])
        try:
            result = subprocess.run(
                step["cmd"], capture_output=True, text=True, timeout=600,
            )
            if result.returncode != 0:
                logger.error("COLMAP %s failed:\n%s", step["name"], result.stderr)
                return False
        except FileNotFoundError:
            logger.error("COLMAP not installed. Install with: apt install colmap")
            return False
        except subprocess.TimeoutExpired:
            logger.error("COLMAP %s timed out", step["name"])
            return False

    logger.info("COLMAP SfM complete. Sparse model: %s", sparse_dir)
    return True


def train_gaussian_splatting(workspace: Path, output_dir: Path) -> bool:
    """
    Train a 3D Gaussian Splatting model using nerfstudio.

    Requires nerfstudio and gsplat installed.
    """
    try:
        result = subprocess.run(
            [
                "ns-train", "splatfacto",
                "--data", str(workspace),
                "--output-dir", str(output_dir),
                "--max-num-iterations", "7000",
                "--pipeline.model.num-downscales", "2",
            ],
            capture_output=True, text=True, timeout=1800,
        )
        if result.returncode != 0:
            logger.error("Gaussian splatting training failed:\n%s", result.stderr)
            return False
    except FileNotFoundError:
        logger.error(
            "nerfstudio not installed. Install with: "
            "pip install nerfstudio gsplat"
        )
        return False
    except subprocess.TimeoutExpired:
        logger.error("Gaussian splatting training timed out")
        return False

    logger.info("3D Gaussian Splatting training complete")
    return True


def export_ply(output_dir: Path, export_path: Path) -> bool:
    """Export trained model to .ply point cloud."""
    try:
        result = subprocess.run(
            [
                "ns-export", "gaussian-splat",
                "--load-config", str(output_dir / "config.yml"),
                "--output-dir", str(export_path.parent),
            ],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            logger.error("PLY export failed:\n%s", result.stderr)
            return False
    except FileNotFoundError:
        logger.error("nerfstudio not installed")
        return False

    logger.info("Exported 3D model: %s", export_path)
    return True


def generate_web_viewer(ply_path: Path, output_html: Path) -> None:
    """Generate a minimal three.js viewer for the PLY point cloud."""
    html = f"""\
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>3D Vehicle Model</title>
<style>
  body {{ margin: 0; overflow: hidden; background: #1a1a2e; }}
  #info {{ position: absolute; top: 10px; left: 10px; color: #64ffda;
           font-family: sans-serif; font-size: 14px; }}
</style>
</head><body>
<div id="info">Drag to rotate &bull; Scroll to zoom</div>
<script type="importmap">
{{ "imports": {{
    "three": "https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/"
}} }}
</script>
<script type="module">
import * as THREE from 'three';
import {{ OrbitControls }} from 'three/addons/controls/OrbitControls.js';
import {{ PLYLoader }} from 'three/addons/loaders/PLYLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);
const renderer = new THREE.WebGLRenderer({{ antialias: true }});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

new PLYLoader().load('{ply_path.name}', geometry => {{
  geometry.computeVertexNormals();
  const material = new THREE.PointsMaterial({{ size: 0.005, vertexColors: true }});
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  const box = new THREE.Box3().setFromObject(points);
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(0, 2, 5));
}});

function animate() {{
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}}
animate();
addEventListener('resize', () => {{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}});
</script>
</body></html>
"""
    output_html.write_text(html)
    logger.info("Generated 3D viewer: %s", output_html)


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------


def reconstruct(event_dir: Path) -> bool:
    """Run the full 3D reconstruction pipeline."""
    images = collect_images(event_dir)
    if len(images) < 5:
        logger.error("Need at least 5 images for 3D reconstruction, got %d", len(images))
        return False

    workspace = event_dir / "colmap_workspace"
    prepare_colmap_workspace(images, workspace)

    if not run_colmap_sfm(workspace):
        return False

    output_dir = event_dir / "gaussian_splatting"
    if not train_gaussian_splatting(workspace, output_dir):
        return False

    ply_path = event_dir / "model.ply"
    if not export_ply(output_dir, ply_path):
        return False

    viewer_path = event_dir / "viewer_3d.html"
    generate_web_viewer(ply_path, viewer_path)

    logger.info("3D reconstruction complete for %s", event_dir.name)
    return True


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="3D Gaussian Splatting reconstruction from scan images",
    )
    parser.add_argument(
        "event_dir",
        help="Path to the scan event directory containing burst images",
    )
    parser.add_argument(
        "--sagemaker", action="store_true",
        help="Download images from S3 first (pass S3 URI as event_dir)",
    )
    args = parser.parse_args()

    if args.sagemaker:
        logger.info("SageMaker mode: downloading from %s", args.event_dir)
        logger.error("SageMaker download not yet implemented")
        return 1

    event_dir = Path(args.event_dir)
    if not event_dir.is_dir():
        logger.error("Event directory not found: %s", event_dir)
        return 1

    return 0 if reconstruct(event_dir) else 1


if __name__ == "__main__":
    sys.exit(main())
