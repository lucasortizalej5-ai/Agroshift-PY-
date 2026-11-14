"""Supervisor mínimo: un servidor SSR público y FastAPI interno; no usar shell."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
children = []
stopping = False

def shutdown(signum=None, frame=None):
    global stopping
    if stopping:
        return
    stopping = True
    for child in children:
        if child.poll() is None:
            child.terminate()

signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

try:
    children.append(subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--app-dir', str(ROOT / 'backend'),
                                     '--host', '127.0.0.1', '--port', '8000', '--no-access-log'], cwd=ROOT))
    children.append(subprocess.Popen(['node', 'server.mjs', '--production'], cwd=ROOT / 'frontend'))
    while not stopping and all(child.poll() is None for child in children):
        time.sleep(.25)
    failure = not stopping and any(child.poll() not in (None, 0) for child in children)
finally:
    shutdown()
    for child in children:
        try:
            child.wait(timeout=8)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
sys.exit(1 if failure else 0)
