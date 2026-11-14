"""Verifica HTTP real SSR -> proxy -> FastAPI -> SQLite. --live agrega NASA real."""
import argparse
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import tempfile
import time
from datetime import date, timedelta
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def call(url, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=45) as response:
        content = response.read().decode()
        if response.status == 204 or not content:
            return None
        return json.loads(content) if 'application/json' in response.headers.get('content-type', '') else content

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live', action='store_true', help='Consultar NASA real; necesita internet.')
    args = parser.parse_args()
    if not (ROOT / 'frontend/dist/server/entry-server.js').exists():
        raise SystemExit('Primero ejecutá npm run build en frontend.')
    api_port, web_port = free_port(), free_port()
    with tempfile.TemporaryDirectory(prefix='agroshift-test-') as temporary:
        env = {**os.environ, 'APP_ENV': 'development', 'API_INTERNAL_TOKEN': '', 'WEB_USERNAME': '',
               'WEB_PASSWORD': '', 'HOST': '127.0.0.1', 'PORT': str(web_port),
               'DATABASE_PATH': str(Path(temporary) / 'test.sqlite3'),
               'API_BASE_URL': f'http://127.0.0.1:{api_port}'}
        backend = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--app-dir', str(ROOT / 'backend'),
                                    '--host', '127.0.0.1', '--port', str(api_port)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        web = subprocess.Popen(['node', 'server.mjs', '--production'], cwd=ROOT / 'frontend', env=env,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        origin = f'http://127.0.0.1:{web_port}'
        try:
            deadline = time.monotonic() + 20
            while True:
                try:
                    if call(origin + '/healthz')['status'] == 'ok':
                        break
                except Exception:
                    if time.monotonic() > deadline:
                        raise RuntimeError('Los servidores no iniciaron. Revisá las dependencias.')
                    time.sleep(.2)
            html = call(origin)
            assert 'Una mejor decisión' in html and '<!--app-html-->' not in html
            print('PASS: HTML SSR con contenido real antes de JavaScript.')
            plot = call(origin + '/api/parcels', 'POST', {'name': 'Parcela SSR verificada', 'latitude': -25.45,
                        'longitude': -54.92, 'radius_m': 200, 'previous_crop': 'soja'})
            assert plot['recommendation']['candidates']
            html = call(origin)
            assert 'Parcela SSR verificada' in html
            state = json.loads(re.search(r'<script id="initial-state" type="application/json">(.*?)</script>', html, re.S).group(1))
            assert state['parcels'][0]['id'] == plot['id']
            print('PASS: registro desde proxy, persistencia SQLite y datos de parcela en HTML SSR.')
            if args.live:
                end = date.today() - timedelta(days=7)
                period = {'start_date': (end - timedelta(days=29)).isoformat(), 'end_date': end.isoformat()}
                result = call(origin + f'/api/parcels/{plot["id"]}/analyze', 'POST', period)
                climate = result['climate']
                assert climate['source'] == 'NASA POWER' and len(climate['daily']) == 30
                assert climate['summary']['T2M']['valid_days'] > 0
                assert climate['is_simulation'] is False and climate['is_forecast'] is False
                evidence = {k: climate[k] for k in ['source', 'source_url', 'fetched_at', 'start_date', 'end_date', 'summary', 'warnings', 'upstream_sources']}
                evidence_path = ROOT / 'work/live-verification.json'
                evidence_path.parent.mkdir(exist_ok=True)
                evidence_path.write_text(json.dumps(evidence, indent=2, ensure_ascii=False), encoding='utf-8')
                html = call(origin)
                assert climate['source_url'].replace('&', '&amp;') in html or climate['source_url'] in html
                print('PASS: NASA real a través del frontend y backend, con fuente y fecha.')
                print(json.dumps(evidence, ensure_ascii=False, indent=2))
            call(origin + f'/api/parcels/{plot["id"]}', 'DELETE')
            assert call(origin + '/api/parcels')['parcels'] == []
            print('PASS: eliminación de la parcela de prueba. No se modificaron datos del usuario.')
        finally:
            for process in [web, backend]:
                process.terminate()
            for process in [web, backend]:
                try:
                    process.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()

if __name__ == '__main__':
    main()
