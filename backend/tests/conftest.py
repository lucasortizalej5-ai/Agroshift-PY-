"""Fixtures sintéticas EXCLUSIVAS de pruebas. Nunca se cargan en la aplicación."""
from pathlib import Path
import copy
import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.config import Settings

@pytest.fixture
def nasa_payload():
    return {'header': {'fill_value': -999, 'time_standard': 'LST', 'sources': ['MERRA2'], 'api': {'version': 'test'}},
            'properties': {'parameter': {
                'T2M': {'20240101': 20, '20240102': 25, '20240103': 30},
                'T2M_MAX': {'20240101': 25, '20240102': 30, '20240103': 35},
                'T2M_MIN': {'20240101': 15, '20240102': 20, '20240103': 25},
                'PRECTOTCORR': {'20240101': 0, '20240102': 10, '20240103': 5},
                'RH2M': {'20240101': 60, '20240102': 70, '20240103': 80},
            }}}

@pytest.fixture
def parcel_payload():
    return {'name': 'Lote de prueba', 'latitude': -25.45, 'longitude': -54.92, 'radius_m': 200,
            'previous_crop': 'soja', 'soil_texture': 'desconocida', 'drainage': 'desconocido',
            'soil_ph': None, 'soil_test_date': None, 'notes': ''}

@pytest.fixture
def app(tmp_path, nasa_payload):
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=copy.deepcopy(nasa_payload)))
    return create_app(Settings(tmp_path / 'test.sqlite3'), nasa_transport=transport)

@pytest.fixture
def client(app):
    with TestClient(app) as client:
        yield client
