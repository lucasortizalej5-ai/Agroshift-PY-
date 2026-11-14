from datetime import date, timedelta, datetime
from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator

class Crop(str, Enum):
    soy = 'soja'
    maize = 'maiz'
    wheat = 'trigo'
    cassava = 'mandioca'
    beans = 'poroto'

class ParcelInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)
    name: str = Field(min_length=1, max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_m: float = Field(ge=50, le=2000)
    previous_crop: Crop | None = None
    soil_texture: Literal['desconocida', 'arcillosa', 'franca', 'arenosa'] = 'desconocida'
    drainage: Literal['desconocido', 'bueno', 'intermedio', 'lento'] = 'desconocido'
    soil_ph: float | None = Field(default=None, ge=3, le=10)
    soil_test_date: date | None = None
    notes: str = Field(default='', max_length=1000)

    @model_validator(mode='after')
    def soil_test_consistency(self):
        if self.soil_ph is not None and self.soil_test_date is None:
            raise ValueError('Si ingresás pH, indicá la fecha del análisis de suelo.')
        if self.soil_test_date and self.soil_test_date > date.today():
            raise ValueError('La fecha del análisis no puede ser futura.')
        return self

class ClimateQuery(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    start_date: date
    end_date: date

    @model_validator(mode='after')
    def validate_dates(self):
        if self.start_date < date(1981, 1, 1):
            raise ValueError('NASA POWER meteorológico está disponible desde 1981.')
        if self.end_date < self.start_date:
            raise ValueError('La fecha final debe ser posterior a la inicial.')
        if (self.end_date - self.start_date).days >= 366:
            raise ValueError('Consultá como máximo 366 días por solicitud.')
        if self.end_date > date.today() - timedelta(days=2):
            raise ValueError('Elegí un período finalizado hace al menos dos días; no es un pronóstico.')
        return self

class AnalyzeInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    start_date: date
    end_date: date
    refresh: bool = False
