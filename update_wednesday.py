import sys
import subprocess
from pathlib import Path

PROJECT = Path(r"E:\gorkhapatra-quiz-main")
PYTHON = PROJECT / ".venv" / "Scripts" / "python.exe"
SCRAPER = PROJECT / "scraper.py"
AI_GEN = PROJECT / "ai_generator.py"

def run(cmd, label):
    print(f"\n=== {label} ===")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=PROJECT)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)
    if result.returncode != 0:
        print(f"FAILED: {label}")
        sys.exit(1)

run([str(PYTHON), str(SCRAPER)], "Scraping latest article")
run([str(PYTHON), str(AI_GEN)], "Generating quiz")
print("\nDone! Data updated.")
