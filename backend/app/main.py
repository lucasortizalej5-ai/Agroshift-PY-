from contextlib import asynccontextmanager
from datetime import date, timedelta
import secrets
import sqlite3
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from .config import Settings
from .database import Database
from .models import ParcelInput, ClimateQuery, AnalyzeInput
from .services.geo import boundary, validate_circle, inside_region
from .services.nasa import NASAService, NASAError
from .services.rotation import CROPS, recommend

def create_app(settings=None, nasa_transport=None):
    settings = settings or Settings.from_env()
    db = Database(settings.database_path)
    nasa = NASAService(db, settings, transport=nasa_transport)

    @asynccontextmanager
    async def lifespan(app):
        db.initialize()
        yield

    app = FastAPI(title='AgroShift PY API', version='0.1.0', lifespan=lifespan,
                  docs_url='/api/docs', openapi_url='/api/openapi.json', redoc_url=None)
    app.state.database = db
    app.state.nasa = nasa

    @app.middleware('http')
    async def protect_api(request: Request, call_next):
        if request.url.path != '/api/health' and settings.internal_token:
            provided = request.headers.get('x-internal-token', '')
            if not secrets.compare_digest(provided, settings.internal_token):
                return JSONResponse({'error': {'code': 'UNAUTHORIZED', 'message': 'Acceso no autorizado.'}}, status_code=401)
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                if int(request.headers.get('content-length', '0')) > 65536:
                    return JSONResponse({'error': {'code': 'BODY_TOO_LARGE', 'message': 'Solicitud demasiado grande.'}}, status_code=413)
            except ValueError:
                return JSONResponse({'error': {'code': 'BAD_LENGTH', 'message': 'Solicitud inválida.'}}, status_code=400)
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Do not echo private input or exception context into the response.
        return JSONResponse({'error': {'code': 'VALIDATION_ERROR', 'message': 'Revisá los datos enviados.',
                                     'fields': [{'field': '.'.join(str(x) for x in e['loc'][1:]), 'message': e['msg']} for e in exc.errors()]}}, status_code=422)

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return JSONResponse({'error': {'code': 'REQUEST_ERROR', 'message': str(exc.detail)}}, status_code=exc.status_code)

    @app.exception_handler(NASAError)
    async def nasa_error(request, exc):
        return JSONResponse({'error': {'code': exc.code, 'message': exc.message}}, status_code=exc.status)

    @app.exception_handler(sqlite3.Error)
    async def database_error(request, exc):
        return JSONResponse({'error': {'code': 'DATABASE_ERROR', 'message': 'No se pudo acceder a la base de datos. Reintentá.'}}, status_code=503)

    def get_parcel(parcel_id):
        parcel = db.get_parcel(parcel_id)
        if not parcel:
            raise HTTPException(404, 'No se encontró la parcela.')
        return parcel

    def view_parcel(parcel):
        climate = db.snapshot(parcel['id'])
        return {**parcel, 'climate': climate, 'recommendation': recommend(parcel, climate)}

    def require_region(parcel):
        if not validate_circle(parcel.latitude, parcel.longitude, parcel.radius_m):
            raise HTTPException(422, 'El piloto está limitado a Alto Paraná. El centro y el radio deben quedar dentro del departamento.')

    @app.get('/api/health')
    def health():
        return {'status': 'ok', 'app': 'AgroShift PY', 'version': '0.1.0'}

    @app.get('/api/bootstrap')
    def bootstrap():
        end = date.today() - timedelta(days=7)
        return {'parcels': [view_parcel(p) for p in db.list_parcels()], 'crops': CROPS,
                'region': {'name': 'Alto Paraná', 'country': 'Paraguay', 'boundary': boundary()},
                'default_period': {'start_date': (end - timedelta(days=29)).isoformat(), 'end_date': end.isoformat()},
                'features': {'rotation': 'initial_rules', 'irrigation': 'planned', 'fertilization': 'planned',
                             'climate_risks': 'planned', 'harvest': 'planned'},
                'privacy': 'Instalación de un solo equipo. SQLite local; no hay cuentas individuales.'}

    @app.get('/api/parcels')
    def list_parcels():
        return {'parcels': [view_parcel(p) for p in db.list_parcels()]}

    @app.post('/api/parcels', status_code=201)
    def create_parcel(parcel: ParcelInput):
        require_region(parcel)
        return view_parcel(db.save_parcel(parcel))

    @app.get('/api/parcels/{parcel_id}')
    def read_parcel(parcel_id: str):
        return view_parcel(get_parcel(parcel_id))

    @app.put('/api/parcels/{parcel_id}')
    def update_parcel(parcel_id: str, parcel: ParcelInput):
        get_parcel(parcel_id)
        require_region(parcel)
        return view_parcel(db.save_parcel(parcel, parcel_id))

    @app.delete('/api/parcels/{parcel_id}', status_code=204)
    def delete_parcel(parcel_id: str):
        if not db.delete_parcel(parcel_id):
            raise HTTPException(404, 'No se encontró la parcela.')

    @app.post('/api/climate')
    async def climate(query: ClimateQuery):
        if not inside_region(query.latitude, query.longitude):
            raise HTTPException(422, 'La ubicación está fuera del piloto de Alto Paraná.')
        return await nasa.get(query)

    @app.post('/api/parcels/{parcel_id}/analyze')
    async def analyze(parcel_id: str, body: AnalyzeInput):
        parcel = get_parcel(parcel_id)
        try:
            query = ClimateQuery(latitude=parcel['latitude'], longitude=parcel['longitude'],
                                 start_date=body.start_date, end_date=body.end_date)
        except ValueError:
            raise HTTPException(422, 'Período inválido: elegí entre 1 y 366 días desde 1981 y hasta hace al menos dos días.')
        result = await nasa.get(query, refresh=body.refresh)
        latest = get_parcel(parcel_id)
        if any(latest[k] != parcel[k] for k in ['latitude', 'longitude']):
            raise HTTPException(409, 'La ubicación cambió durante la consulta. Volvé a consultar NASA.')
        db.save_snapshot(parcel_id, result)
        return view_parcel(latest)

    @app.get('/api/parcels/{parcel_id}/recommendation')
    def recommendation(parcel_id: str):
        parcel = get_parcel(parcel_id)
        return recommend(parcel, db.snapshot(parcel_id))

    return app

app = create_app()
