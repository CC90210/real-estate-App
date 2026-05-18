from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Sequence


def _log(job_id: str, message: str) -> None:
    print(f"[{job_id}] {message}", flush=True)


def _symlink_or_copy(source: Path, destination: Path) -> None:
    if destination.exists() or destination.is_symlink():
        if destination.is_dir() and not destination.is_symlink():
            shutil.rmtree(destination)
        else:
            destination.unlink()

    try:
        destination.symlink_to(source, target_is_directory=source.is_dir())
    except OSError:
        if source.is_dir():
            shutil.copytree(source, destination)
        else:
            shutil.copy2(source, destination)


def _run(job_id: str, command: Sequence[str], cwd: Path, env: dict[str, str]) -> None:
    _log(job_id, f"Running: {' '.join(command)}")
    try:
        completed = subprocess.run(
            list(command),
            cwd=str(cwd),
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.strip() if exc.stderr else ""
        stdout = exc.stdout.strip() if exc.stdout else ""
        raise RuntimeError(
            f"gsplat training failed with exit code {exc.returncode}: {' '.join(command)}\n"
            f"stdout:\n{stdout}\n"
            f"stderr:\n{stderr}"
        ) from exc

    if completed.stdout:
        _log(job_id, completed.stdout.strip())
    if completed.stderr:
        _log(job_id, completed.stderr.strip())


def _prepare_dataset(photo_dir: Path, colmap_dir: Path, dataset_dir: Path) -> None:
    dataset_dir.mkdir(parents=True, exist_ok=True)
    if colmap_dir.name != "0" or colmap_dir.parent.name != "sparse":
        raise ValueError(f"Expected COLMAP sparse model at <dataset>/sparse/0, got {colmap_dir}")

    _symlink_or_copy(photo_dir, dataset_dir / "images")
    _symlink_or_copy(colmap_dir.parent, dataset_dir / "sparse")


def train(
    photo_dir: str | Path,
    colmap_dir: str | Path,
    output_ply_path: str | Path,
    iterations: int = 30000,
) -> Path:
    from gsplat import export_splats as _export_splats

    if _export_splats is None:
        raise RuntimeError("gsplat export_splats is unavailable")
    if iterations < 1:
        raise ValueError("iterations must be positive")

    photos = Path(photo_dir)
    sparse_model_dir = Path(colmap_dir)
    output_path = Path(output_ply_path)
    job_dir = output_path.parent
    job_id = job_dir.name
    result_dir = job_dir / "gsplat-results"
    dataset_dir = job_dir / "gsplat-dataset"

    examples_dir = Path(os.environ.get("GSPLAT_EXAMPLES_DIR", "/opt/gsplat/examples"))
    trainer_script = examples_dir / "simple_trainer.py"
    if not trainer_script.is_file():
        raise FileNotFoundError(f"gsplat simple_trainer.py not found at {trainer_script}")

    _prepare_dataset(photos, sparse_model_dir, dataset_dir)
    result_dir.mkdir(parents=True, exist_ok=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    pythonpath_parts = [str(examples_dir), str(examples_dir.parent)]
    if env.get("PYTHONPATH"):
        pythonpath_parts.append(env["PYTHONPATH"])
    env["PYTHONPATH"] = os.pathsep.join(pythonpath_parts)

    command = [
        "python",
        str(trainer_script),
        "default",
        "--data_dir",
        str(dataset_dir),
        "--data_factor",
        "1",
        "--result_dir",
        str(result_dir),
        "--max_steps",
        str(iterations),
        "--save_ply",
        "--ply_steps",
        str(iterations),
        "--save_steps",
        str(iterations),
        "--eval_steps",
        str(iterations),
        "--disable_viewer",
        "--disable_video",
    ]
    _run(job_id, command, examples_dir, env)

    ply_files = sorted((result_dir / "ply").glob("*.ply"), key=lambda path: path.stat().st_mtime)
    if not ply_files:
        raise RuntimeError(f"gsplat did not produce a PLY in {result_dir / 'ply'}")

    shutil.copy2(ply_files[-1], output_path)
    return output_path
