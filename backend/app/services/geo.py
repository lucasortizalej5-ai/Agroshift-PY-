"""Geocerca aproximada del piloto: geoBoundaries PRY ADM1 (2012, CC BY 4.0)."""
import json
import math
from pathlib import Path
from functools import lru_cache

@lru_cache
def boundary():
    return json.loads((Path(__file__).resolve().parents[1] / 'data' / 'alto-parana.geojson').read_text())

def _ring_contains(lon, lat, ring):
    inside = False
    previous = ring[-1]
    for current in ring:
        xi, yi = current[:2]
        xj, yj = previous[:2]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        previous = current
    return inside

def inside_region(latitude: float, longitude: float):
    if not all(math.isfinite(x) for x in [latitude, longitude]):
        return False
    geometry = boundary()['geometry']
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    return any(_ring_contains(longitude, latitude, polygon[0]) and
               not any(_ring_contains(longitude, latitude, hole) for hole in polygon[1:]) for polygon in polygons)

def validate_circle(latitude, longitude, radius_m):
    if not inside_region(latitude, longitude):
        return False
    for i in range(64):
        angle = i * math.tau / 64
        lat = latitude + math.cos(angle) * radius_m / 111320
        lon = longitude + math.sin(angle) * radius_m / (111320 * math.cos(math.radians(latitude)))
        if not inside_region(lat, lon):
            return False
    return True

def area_hectares(radius_m):
    if not math.isfinite(radius_m) or radius_m <= 0:
        raise ValueError('El radio debe ser positivo y finito.')
    return math.pi * radius_m ** 2 / 10000
