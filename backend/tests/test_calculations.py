import math
from datetime import date, timedelta
import pytest
from pydantic import ValidationError
from app.models import ClimateQuery, ParcelInput
from app.services.geo import area_hectares, inside_region, validate_circle
from app.services.nasa import normalize, NASAError
from app.services.rotation import recommend, CROPS

def query():
    return ClimateQuery(latitude=-25.45, longitude=-54.92, start_date='2024-01-01', end_date='2024-01-03')

def test_circle_area_is_hectares():
    assert area_hectares(100) == pytest.approx(math.pi)
    assert area_hectares(200) == pytest.approx(12.566370614359172)

@pytest.mark.parametrize('radius', [0, -1, math.inf, math.nan])
def test_invalid_area(radius):
    with pytest.raises(ValueError):
        area_hectares(radius)

def test_geofence_distinguishes_asuncion_and_alto_parana():
    assert inside_region(-25.45, -54.92)
    assert validate_circle(-25.45, -54.92, 200)
    assert not inside_region(-25.3, -57.6)
    assert not inside_region(0, 0)

def test_summary_units_and_daily_rain_integration(nasa_payload):
    result = normalize(nasa_payload, query(), 'https://power.larc.nasa.gov/test')
    assert result['summary']['T2M']['value'] == 25
    assert result['summary']['PRECTOTCORR']['value'] == 15
    assert result['summary']['PRECTOTCORR']['unit'] == 'mm'
    assert result['summary']['RH2M']['value'] == 70
    assert result['is_forecast'] is False
    assert result['is_simulation'] is False

def test_missing_not_zero_and_partial_rain_not_full_total(nasa_payload):
    nasa_payload['properties']['parameter']['T2M']['20240102'] = -999
    nasa_payload['properties']['parameter']['PRECTOTCORR']['20240102'] = -999
    result = normalize(nasa_payload, query(), 'https://power.larc.nasa.gov/test')
    assert result['daily'][1]['T2M'] is None
    assert result['summary']['T2M']['value'] == 25
    assert result['summary']['T2M']['valid_days'] == 2
    assert result['summary']['PRECTOTCORR']['value'] is None
    assert result['summary']['PRECTOTCORR']['available_sum'] == 5
    assert len(result['warnings']) == 2

def test_empty_series_is_not_fabricated(nasa_payload):
    for key in nasa_payload['properties']['parameter']:
        nasa_payload['properties']['parameter'][key] = {}
    with pytest.raises(NASAError, match='NASA no tiene'):
        normalize(nasa_payload, query(), 'https://power.larc.nasa.gov/test')

def test_invalid_upstream_structure():
    with pytest.raises(NASAError):
        normalize({'error': 'bad'}, query(), 'test')

def test_zero_rain_is_valid_data(nasa_payload):
    result = normalize(nasa_payload, query(), 'test')
    assert result['daily'][0]['PRECTOTCORR'] == 0
    assert result['summary']['PRECTOTCORR']['valid_days'] == 3

def test_unknown_history_does_not_invent_a_crop():
    result = recommend({'previous_crop': None})
    assert result['status'] == 'needs_history'
    assert result['candidates'] == []

@pytest.mark.parametrize('previous', ['soja', 'maiz', 'trigo', 'mandioca', 'poroto'])
def test_recommendations_change_family(previous):
    result = recommend({'previous_crop': previous})
    prior = next(c for c in CROPS if c['id'] == previous)
    assert result['candidates']
    assert all(c['id'] != previous and c['family'] != prior['family'] for c in result['candidates'])
    assert result['fertilizer_dose'] is None
    assert result['fertility_status'] == 'no_determinada'

def test_soy_and_beans_are_same_family():
    result = recommend({'previous_crop': 'soja'})
    excluded = {c['id']: c['rule_id'] for c in result['excluded']}
    assert excluded['soja'] == 'ROT-01'
    assert excluded['poroto'] == 'ROT-02'

def test_climate_does_not_create_unvalidated_suitability(nasa_payload):
    climate = normalize(nasa_payload, query(), 'test')
    first = recommend({'previous_crop': 'maiz'})
    with_climate = recommend({'previous_crop': 'maiz'}, climate)
    assert [c['id'] for c in first['candidates']] == [c['id'] for c in with_climate['candidates']]
    assert with_climate['climate_used_as_context'] is True

def test_ph_requires_real_test_date(parcel_payload):
    with pytest.raises(ValidationError):
        ParcelInput(**{**parcel_payload, 'soil_ph': 5.8})

@pytest.mark.parametrize('changes', [
    {'end_date': '2023-12-01'}, {'start_date': '1980-01-01'},
    {'end_date': date.today().isoformat()}, {'end_date': '2025-01-01'},
])
def test_invalid_query_periods(changes):
    with pytest.raises(ValidationError):
        ClimateQuery(**{'latitude': -25.45, 'longitude': -54.92, 'start_date': '2024-01-01', 'end_date': '2024-01-03', **changes})
