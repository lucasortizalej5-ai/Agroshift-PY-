"""Valida Compose sin construir imágenes ni mostrar credenciales reales."""
from pathlib import Path
import json
import os
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ComposeConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='agroshift-compose-')
        self.directory = Path(self.temporary.name)
        shutil.copy(ROOT / 'compose.yaml', self.directory / 'compose.yaml')
        # Synthetic test-only values; never read the user's .env.
        self.values = {
            'APP_ENV': 'development', 'HOST': '127.0.0.1', 'PORT': '5173',
            'API_BASE_URL': 'http://127.0.0.1:8001', 'DATABASE_PATH': 'backend/data/local.sqlite3',
            'WEB_USERNAME': 'test-only', 'WEB_PASSWORD': 'synthetic-test-password',
            'API_INTERNAL_TOKEN': 'x' * 40, 'NASA_CACHE_HOURS': '12', 'AGROSHIFT_PORT': '8097',
        }
        self.env = {k: v for k, v in os.environ.items() if k not in self.values}

    def tearDown(self):
        self.temporary.cleanup()

    def config(self):
        (self.directory / '.env').write_text('\n'.join(f'{k}={v}' for k, v in self.values.items()) + '\n', encoding='utf-8')
        return subprocess.run(['docker', 'compose', '-f', str(self.directory / 'compose.yaml'),
                               '--project-directory', str(self.directory), 'config', '--format', 'json'],
                              env=self.env, text=True, capture_output=True)

    def test_env_file_reaches_container_and_internal_settings_override_local(self):
        result = self.config()
        self.assertEqual(result.returncode, 0, 'Docker Compose no pudo validar el archivo.')
        service = json.loads(result.stdout)['services']['agroshift']
        values = service['environment']
        self.assertEqual(values['WEB_USERNAME'], self.values['WEB_USERNAME'])
        self.assertEqual(values['WEB_PASSWORD'], self.values['WEB_PASSWORD'])
        self.assertEqual(values['API_INTERNAL_TOKEN'], self.values['API_INTERNAL_TOKEN'])
        self.assertEqual(values['NASA_CACHE_HOURS'], '12')
        self.assertEqual(values['APP_ENV'], 'production')
        self.assertEqual(values['HOST'], '0.0.0.0')
        self.assertEqual(values['PORT'], '8080')
        self.assertEqual(values['API_BASE_URL'], 'http://127.0.0.1:8000')
        self.assertEqual(values['DATABASE_PATH'], '/data/agroshift.sqlite3')
        self.assertEqual(service['ports'][0]['published'], '8097')
        self.assertEqual(service['ports'][0]['host_ip'], '127.0.0.1')
        self.assertEqual(service['volumes'][0]['target'], '/data')
        self.assertEqual(service['volumes'][0]['type'], 'volume')

    def test_each_missing_credential_fails_before_startup(self):
        for key in ['WEB_USERNAME', 'WEB_PASSWORD', 'API_INTERNAL_TOKEN']:
            with self.subTest(variable=key):
                previous = self.values.pop(key)
                self.env.pop(key, None)
                result = self.config()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(key, result.stderr)
                self.values[key] = previous

if __name__ == '__main__':
    unittest.main()
