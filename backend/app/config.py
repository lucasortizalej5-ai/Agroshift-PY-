from dataclasses import dataclass
from pathlib import Path
import os
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / '.env')

@dataclass(frozen=True)
class Settings:
    database_path: Path
    environment: str = 'development'
    internal_token: str = ''
    nasa_timeout: float = 30
    cache_hours: int = 24

    @classmethod
    def from_env(cls):
        path = Path(os.getenv('DATABASE_PATH', 'backend/data/agroshift.sqlite3'))
        if not path.is_absolute():
            path = ROOT / path
        settings = cls(path, os.getenv('APP_ENV', 'development'), os.getenv('API_INTERNAL_TOKEN', ''),
                       float(os.getenv('NASA_TIMEOUT_SECONDS', '30')), int(os.getenv('NASA_CACHE_HOURS', '24')))
        if settings.environment == 'production' and len(settings.internal_token) < 32:
            raise ValueError('Producción requiere API_INTERNAL_TOKEN de al menos 32 caracteres.')
        return settings
