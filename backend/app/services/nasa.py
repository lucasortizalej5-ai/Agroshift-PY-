"""NASA POWER diario: sin mediciones inventadas, interpolación ni pronósticos."""
from datetime import datetime, timedelta, timezone
import json
import math
import httpx
from ..models import ClimateQuery

BASE_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point'
PARAMETERS = ['T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M']
UNITS = {'T2M': '°C', 'T2M_MAX': '°C', 'T2M_MIN': '°C', 'PRECTOTCORR': 'mm/día', 'RH2M': '%'}

class NASAError(Exception):
    def __init__(self, code, message, status=502):
        self.code, self.message, self.status = code, message, status
        super().__init__(message)

def _number(value, fill):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return None
    if value == fill or value == -999:
        return None
    return float(value)

def normalize(payload, query: ClimateQuery, source_url: str):
    try:
        parameters = payload['properties']['parameter']
        if not isinstance(parameters, dict):
            raise TypeError
        fill = payload.get('header', {}).get('fill_value', -999)
    except (KeyError, TypeError, AttributeError):
        raise NASAError('NASA_INVALID_RESPONSE', 'NASA devolvió una respuesta sin una serie meteorológica válida.')
    expected = (query.end_date - query.start_date).days + 1
    daily = []
    for offset in range(expected):
        day = query.start_date + timedelta(days=offset)
        key = day.strftime('%Y%m%d')
        values = {}
        for parameter in PARAMETERS:
            series = parameters.get(parameter, {})
            value = _number(series.get(key) if isinstance(series, dict) else None, fill)
            if parameter == 'RH2M' and value is not None and not 0 <= value <= 100:
                value = None
            if parameter == 'PRECTOTCORR' and value is not None and value < 0:
                value = None
            values[parameter] = value
        daily.append({'date': day.isoformat(), **values})
    if not any(any(row[p] is not None for p in PARAMETERS) for row in daily):
        raise NASAError('NASA_NO_DATA', 'NASA no tiene valores válidos para ese período. Probá un período anterior.', 404)
    summary, warnings = {}, []
    for parameter in PARAMETERS:
        valid = [row[parameter] for row in daily if row[parameter] is not None]
        complete = len(valid) == expected
        aggregation = 'suma' if parameter == 'PRECTOTCORR' else 'promedio'
        # A partial precipitation sum must never look like the full-period total.
        aggregate = sum(valid) if aggregation == 'suma' else sum(valid) / len(valid) if valid else None
        summary[parameter] = {
            'value': aggregate if complete or aggregation != 'suma' else None,
            'available_sum': sum(valid) if aggregation == 'suma' and valid else None,
            'unit': 'mm' if aggregation == 'suma' else UNITS[parameter],
            'valid_days': len(valid), 'expected_days': expected, 'complete': complete,
            'aggregation': aggregation,
        }
        if not complete:
            warnings.append(f'{parameter}: {expected - len(valid)} de {expected} días sin datos válidos. No se rellenaron.')
    header = payload.get('header', {})
    if not isinstance(header, dict):
        header = {}
    api_metadata = header.get('api', {})
    if not isinstance(api_metadata, dict):
        api_metadata = {}
    return {
        'source': 'NASA POWER', 'source_url': source_url,
        'documentation_url': 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/',
        'data_kind': 'estimaciones_meteorologicas_nasa',
        'summary_kind': 'calculo_sobre_datos_nasa',
        'is_forecast': False, 'is_simulation': False,
        'latitude': query.latitude, 'longitude': query.longitude,
        'start_date': query.start_date.isoformat(), 'end_date': query.end_date.isoformat(),
        'fetched_at': datetime.now(timezone.utc).isoformat(),
        'time_standard': header.get('time_standard', 'LST'),
        'upstream_sources': header.get('sources', []),
        'api_version': api_metadata.get('version'),
        'native_resolution': 'Meteorología: aproximadamente 0,5° latitud × 0,625° longitud; no representa un sensor en la parcela.',
        'units': UNITS, 'daily': daily, 'summary': summary, 'warnings': warnings,
        'cached': False, 'stale': False,
        'limitations': [
            'Son estimaciones de modelos y asimilación de observaciones; no mediciones de campo en tu parcela.',
            'El período consultado es pasado; no predice el clima de la próxima siembra.',
            'La humedad RH2M es del aire, no la humedad del suelo.',
            'Un dato faltante no equivale a cero. La precipitación total solo se calcula con todos los días válidos.',
        ],
    }

class NASAService:
    def __init__(self, database, settings, transport=None):
        self.database, self.settings, self.transport = database, settings, transport

    async def get(self, query: ClimateQuery, refresh=False):
        params = {'parameters': ','.join(PARAMETERS), 'community': 'AG',
                  'latitude': query.latitude, 'longitude': query.longitude,
                  'start': query.start_date.strftime('%Y%m%d'), 'end': query.end_date.strftime('%Y%m%d'),
                  'format': 'JSON', 'time-standard': 'LST'}
        source_url = str(httpx.URL(BASE_URL, params=params))
        cached = self.database.cache_get(source_url)
        if cached:
            age = datetime.now(timezone.utc) - datetime.fromisoformat(cached['fetched_at'])
            if not refresh and age < timedelta(hours=self.settings.cache_hours):
                return {**json.loads(cached['data']), 'cached': True}
        try:
            async with httpx.AsyncClient(timeout=self.settings.nasa_timeout, transport=self.transport, follow_redirects=False) as client:
                response = await client.get(BASE_URL, params=params)
            if response.status_code == 429:
                raise NASAError('NASA_RATE_LIMIT', 'NASA está limitando las consultas. Esperá y volvé a intentar.', 503)
            if response.status_code != 200:
                raise NASAError('NASA_UNAVAILABLE', 'No se pudo consultar NASA POWER. Reintentá más tarde.', 503)
            try:
                result = normalize(response.json(), query, source_url)
            except (ValueError, TypeError):
                raise NASAError('NASA_INVALID_RESPONSE', 'NASA devolvió una respuesta que no pudimos interpretar.')
            self.database.cache_put(source_url, result)
            return result
        except httpx.TimeoutException:
            error = NASAError('NASA_TIMEOUT', 'NASA tardó demasiado en responder. Reintentá en unos segundos.', 504)
        except httpx.HTTPError:
            error = NASAError('NASA_CONNECTION', 'No hay conexión con NASA POWER. Verificá internet.', 503)
        except NASAError as exc:
            error = exc
        # Only the exact same coordinates and dates are eligible for fallback.
        if cached:
            saved = json.loads(cached['data'])
            return {**saved, 'cached': True, 'stale': True,
                    'warnings': [*saved['warnings'], 'No se pudo actualizar NASA. Se muestra una copia anterior de esta misma consulta.']}
        raise error
