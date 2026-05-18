from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Sequence


def _log(job_id: str, message: str) -> None:
    print(f"[{job_id}] {message}", flush=True)


def _run(job_id: str, command: Sequence[str]) -> None:
    _log(job_id, f"Running: {' '.join(command)}")
    try:
        completed = subprocess.run(
            list(command),
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.strip() if exc.stderr else ""
        stdout = exc.stdout.strip() if exc.stdout else ""
        raise RuntimeError(
            f"COLMAP command failed with exit code {exc.returncode}: {' '.join(command)}\n"
            f"stdout:\n{stdout}\n"
            f"stderr:\n{stderr}"
        ) from exc

    if completed.stdout:
        _log(job_id, completed.stdout.strip())
    if completed.stderr:
        _log(job_id, completed.stderr.strip())


def run_colmap(photo_dir: str | Path, output_dir: str | Path) -> Path:
    photos = Path(photo_dir)
    output_root = Path(output_dir)
    job_id = output_root.name

    if not photos.is_dir():
        raise FileNotFoundError(f"Photo directory does not exist: {photos}")

    image_files = [path for path in photos.rglob("*") if path.is_file()]
    if len(image_files) < 2:
        raise RuntimeError("COLMAP requires at least two photos for reconstruction")

    output_root.mkdir(parents=True, exist_ok=True)
    database_path = output_root / "database.db"
    sparse_root = output_root / "sparse"
    sparse_root.mkdir(parents=True, exist_ok=True)

    _run(
        job_id,
        [
            "colmap",
            "feature_extractor",
            "--database_path",
            str(database_path),
            "--image_path",
            str(photos),
            "--ImageReader.single_camera",
            "1",
            "--ImageReader.camera_model",
            "OPENCV",
        ],
    )
    _run(
        job_id,
        [
            "colmap",
            "exhaustive_matcher",
            "--database_path",
            str(database_path),
        ],
    )
    _run(
        job_id,
        [
            "colmap",
            "mapper",
            "--database_path",
            str(database_path),
            "--image_path",
            str(photos),
            "--output_path",
            str(sparse_root),
        ],
    )

    sparse_model_dir = sparse_root / "0"
    required_files = ["cameras.bin", "images.bin", "points3D.bin"]
    missing = [name for name in required_files if not (sparse_model_dir / name).is_file()]
    if missing:
        raise RuntimeError(f"COLMAP did not produce sparse model files in {sparse_model_dir}: {missing}")

    return sparse_model_dir
