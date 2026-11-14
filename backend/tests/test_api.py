import asyncio
import json
from datetime import datetime, timedelta, timezone
import httpx
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app
from app.models import ClimateQuery
from app.database import Database
from app.services.nasa import NASAService, normalize

PERIOD = {'start_date': '2024-01-01', 'end_date': '2024-01-03'}

def test_health_and_empty_bootstrap(client):
    assert client.get('/api/health').status_code == 200
    data = client.get('/api/bootstrap').json()
    assert data['parcels'] == []
    assert len(data['crops']) == 5
    assert data['region']['name'] == 'Alto Paraná'

def test_parcel_crud(client, parcel_payload):
    created = client.post('/api/parcels', json=parcel_payload)
    assert created.status_code == 201
    data = created.json()
    assert data['area_ha'] > 12
    assert data['recommendation']['candidates']
    parcel_id = data['id']
    assert len(client.get('/api/parcels').json()['parcels']) == 1
    update = client.put(f'/api/parcels/{parcel_id}', json={**parcel_payload, 'name': 'Nuevo nombre'})
    assert update.status_code == 200
    assert update.json()['name'] == 'Nuevo nombre'
    assert client.delete(f'/api/parcels/{parcel_id}').status_code == 204
    assert client.get(f'/api/parcels/{parcel_id}').status_code == 404

def test_region_validation(client, parcel_payload):
    response = client.post('/api/parcels', json={**parcel_payload, 'latitude': -25.3, 'longitude': -57.6})
    assert response.status_code == 422
    assert not client.get('/api/parcels').json()['parcels']

def test_server_does_not_trust_area_or_unknown_fields(client, parcel_payload):
    assert client.post('/api/parcels', json={**parcel_payload, 'area_ha': 99999}).status_code == 422
    assert client.post('/api/parcels', json={**parcel_payload, 'radius_m': -2}).status_code == 422

def test_analyze_persists_source_and_recommendation(client, parcel_payload):
    p = client.post('/api/parcels', json=parcel_payload).json()
    result = client.post(f'/api/parcels/{p["id"]}/analyze', json=PERIOD)
    assert result.status_code == 200
    data = result.json()
    assert data['climate']['source_url'].startswith('https://power.larc.nasa.gov/')
    assert data['climate']['summary']['PRECTOTCORR']['value'] == 15
    assert data['recommendation']['climate_used_as_context'] is True
    assert client.get(f'/api/parcels/{p["id"]}').json()['climate']

def test_edit_location_invalidates_climate(client, parcel_payload):
    p = client.post('/api/parcels', json=parcel_payload).json()
    client.post(f'/api/parcels/{p["id"]}/analyze', json=PERIOD)
    moved = client.put(f'/api/parcels/{p["id"]}', json={**parcel_payload, 'latitude': -25.451})
    assert moved.status_code == 200
    assert moved.json()['climate'] is None

def test_edit_crop_recalculates_options(client, parcel_payload):
    p = client.post('/api/parcels', json=parcel_payload).json()
    update = client.put(f'/api/parcels/{p["id"]}', json={**parcel_payload, 'previous_crop': 'maiz'})
    assert {c['id'] for c in update.json()['recommendation']['candidates']} == {'soja', 'mandioca', 'poroto'}

def test_no_data_error_keeps_parcel(tmp_path, parcel_payload):
    transport = httpx.MockTransport(lambda r: httpx.Response(200, json={'properties': {'parameter': {}}}))
    with TestClient(create_app(Settings(tmp_path / 'none.sqlite3'), transport)) as client:
        p = client.post('/api/parcels', json=parcel_payload).json()
        response = client.post(f'/api/parcels/{p["id"]}/analyze', json=PERIOD)
        assert response.status_code == 404
        assert response.json()['error']['code'] == 'NASA_NO_DATA'
        assert client.get(f'/api/parcels/{p["id"]}').json()['climate'] is None

def test_upstream_timeout_is_actionable(tmp_path):
    def timeout(request):
        raise httpx.ReadTimeout('test')
    app = create_app(Settings(tmp_path / 'timeout.sqlite3'), httpx.MockTransport(timeout))
    with TestClient(app) as client:
        response = client.post('/api/climate', json={'latitude': -25.45, 'longitude': -54.92, **PERIOD})
        assert response.status_code == 504
        assert response.json()['error']['code'] == 'NASA_TIMEOUT'

def test_sql_input_is_stored_as_text(client, parcel_payload):
    name = "Lote'); DROP TABLE parcels; --"
    assert client.post('/api/parcels', json={**parcel_payload, 'name': name}).status_code == 201
    assert client.get('/api/parcels').json()['parcels'][0]['name'] == name

def test_internal_auth_is_required(tmp_path):
    token = 'x' * 40  # synthetic test-only token
    with TestClient(create_app(Settings(tmp_path / 'auth.sqlite3', internal_token=token))) as client:
        assert client.get('/api/health').status_code == 200
        assert client.get('/api/parcels').status_code == 401
        assert client.get('/api/parcels', headers={'x-internal-token': token}).status_code == 200

def test_sqlite_persists_between_app_instances(tmp_path, parcel_payload):
    settings = Settings(tmp_path / 'persist.sqlite3')
    with TestClient(create_app(settings)) as client:
        p = client.post('/api/parcels', json=parcel_payload).json()
    with TestClient(create_app(settings)) as client:
        assert client.get(f'/api/parcels/{p["id"]}').json()['name'] == parcel_payload['name']

def test_cache_avoids_repeated_nasa_calls(tmp_path, nasa_payload):
    requests = []
    def upstream(request):
        requests.append(request)
        return httpx.Response(200, json=nasa_payload)
    with TestClient(create_app(Settings(tmp_path / 'cache.sqlite3'), httpx.MockTransport(upstream))) as client:
        body = {'latitude': -25.45, 'longitude': -54.92, **PERIOD}
        assert client.post('/api/climate', json=body).json()['cached'] is False
        assert client.post('/api/climate', json=body).json()['cached'] is True
        assert len(requests) == 1

def test_stale_fallback_is_exact_location_and_period(tmp_path, nasa_payload):
    db = Database(tmp_path / 'stale.sqlite3')
    db.initialize()
    settings = Settings(tmp_path / 'stale.sqlite3', cache_hours=0)
    query = ClimateQuery(latitude=-25.45, longitude=-54.92, **PERIOD)
    good = NASAService(db, settings, httpx.MockTransport(lambda r: httpx.Response(200, json=nasa_payload)))
    first = asyncio.run(good.get(query))
    def offline(request):
        raise httpx.ConnectError('test')
    down = NASAService(db, settings, httpx.MockTransport(offline))
    saved = asyncio.run(down.get(query))
    assert saved['stale'] and saved['cached']
    assert saved['fetched_at'] == first['fetched_at']
    changed = query.model_copy(update={'latitude': -25.451})
    import pytest
    from app.services.nasa import NASAError
    with pytest.raises(NASAError):
        asyncio.run(down.get(changed))

def test_validation_does_not_echo_private_notes(client, parcel_payload):
    response = client.post('/api/parcels', json={**parcel_payload, 'notes': 'PRIVATE' * 300})
    assert response.status_code == 422
    assert 'PRIVATE' not in response.text
