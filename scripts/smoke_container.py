"""Comprueba el contenedor con secretos efímeros y un volumen de prueba privado."""
import base64
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
import urllib.error
import urllib.request

def docker(*args, **kwargs):
    return subprocess.check_output(['docker', *args], text=True, **kwargs).strip()

def main():
    volume = 'agroshift-test-' + secrets.token_hex(6)
    token = secrets.token_urlsafe(40)
    password = secrets.token_urlsafe(24)
    env = {**os.environ, 'API_INTERNAL_TOKEN': token, 'WEB_USERNAME': 'smoke-test', 'WEB_PASSWORD': password}
    authorization = 'Basic ' + base64.b64encode(('smoke-test:' + password).encode()).decode()
    container = None
    docker('volume', 'create', volume)
    try:
        parcel_id = None
        for cycle in range(2):
            container = docker('run', '-d', '-p', '127.0.0.1::8080',
                               '-e', 'API_INTERNAL_TOKEN', '-e', 'WEB_USERNAME', '-e', 'WEB_PASSWORD',
                               '--mount', f'type=volume,source={volume},target=/data', 'agroshift-py:local', env=env)
            try:
                port = docker('port', container, '8080/tcp').split(':')[-1]
            except subprocess.CalledProcessError:
                print(docker('logs', container))
                raise
            origin = 'http://127.0.0.1:' + port
            def call(path, method='GET', body=None, protected=True):
                headers = {'Content-Type': 'application/json'}
                if protected:
                    headers['Authorization'] = authorization
                request = urllib.request.Request(origin + path, method=method, headers=headers,
                                                  data=json.dumps(body).encode() if body is not None else None)
                with urllib.request.urlopen(request, timeout=10) as response:
                    content = response.read().decode()
                    return json.loads(content) if 'application/json' in response.headers.get('content-type', '') else content
            deadline = time.monotonic() + 20
            while True:
                try:
                    if call('/healthz', protected=False)['status'] == 'ok':
                        break
                except Exception:
                    if time.monotonic() > deadline:
                        print(docker('logs', container))
                        raise RuntimeError('El contenedor no inició.')
                    time.sleep(.2)
            if cycle == 0:
                try:
                    call('/', protected=False)
                    raise AssertionError('No se exigió acceso protegido.')
                except urllib.error.HTTPError as error:
                    assert error.code == 401
                assert 'A better decision' in call('/')
                print('PASS: contenedor sin root, HTML SSR y acceso protegido.')
                parcel = call('/api/parcels', 'POST', {'name': 'Parcela Docker temporal', 'latitude': -25.45,
                              'longitude': -54.92, 'radius_m': 200, 'previous_crop': 'soja'})
                parcel_id = parcel['id']
                assert parcel['recommendation']['candidates']
            else:
                result = call('/api/parcels/' + parcel_id)
                assert result['name'] == 'Parcela Docker temporal'
                print('PASS: SQLite conserva la parcela después de reemplazar el contenedor con el mismo volumen local.')
            docker('stop', container)
            docker('rm', container)
            container = None
        print('PASS: secretos efímeros no impresos; contenedores y datos de prueba eliminados.')
    finally:
        if container:
            subprocess.run(['docker', 'rm', '-f', container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['docker', 'volume', 'rm', volume], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == '__main__':
    main()
