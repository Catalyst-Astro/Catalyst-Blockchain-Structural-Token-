"""Entry point for the credential registry desktop app."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from fractal_manager.credential_registry_gui import main  # noqa: E402


if __name__ == "__main__":
    main()
