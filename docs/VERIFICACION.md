# Verificación de la primera etapa

Fecha de verificación: **14 de noviembre de 2026**.

## Resultado del código local

- **39 pruebas de Python aprobadas**: área circular, geocerca, cálculo de promedios y lluvia, faltantes, reglas botánicas, validación, CRUD, SQLite, caché, errores de NASA y protección de API.
- **4 pruebas de Node aprobadas**: contenido HTML SSR, serialización segura del estado inicial, acceso protegido y página de error cuando falta el backend.
- **Compilación Vite aprobada** para el cliente y el servidor SSR.
- **Prueba integral HTTP aprobada**: registro a través del proxy, persistencia SQLite y parcela visible en el HTML SSR; eliminación posterior de los datos temporales.
- **Consulta real a NASA POWER aprobada** a través de la misma cadena frontend → FastAPI → proveedor. La base de datos usada fue temporal; no contiene registros de productores reales.

Las pruebas reproducibles no requieren internet. Utilizan datos sintéticos aislados. La verificación NASA real se ejecuta solamente con `scripts/smoke_system.py --live`.

## Evidencia NASA real

La evidencia técnica está en `NASA_VERIFICACION_REAL.json`, separada de los datos iniciales de la aplicación. **No se carga como si fuera el clima de una parcela nueva.**

- Ubicación consultada: latitud -25,45, longitud -54,92, referencia en Alto Paraná.
- Período solicitado: **9 de octubre a 7 de noviembre de 2026**.
- Consulta: **2026-11-14T20:11:14.162197+00:00**.
- Fuente declarada: NASA POWER; productos upstream declarados por la respuesta: GEOSIT y POWER.
- Temperatura media calculada: aproximadamente **22,15 °C**, 30/30 días válidos.
- Precipitación acumulada calculada: **283,46 mm**, 30/30 días válidos.
- Humedad relativa del aire media: aproximadamente **81,81 %**, 30/30 días válidos.

Estos son resúmenes de un período pasado, no un pronóstico ni mediciones de suelo. La URL exacta de la consulta queda conservada en el JSON.

## Límites de esta verificación

- No se realizó validación agronómica en campo ni pruebas con agricultores.
- No se completó una revisión visual interactiva en navegador en este entorno.
- El Dockerfile está preparado con usuario sin privilegios y propietario correcto de los archivos. Una primera imagen compiló; la prueba de arranque detectó permisos de archivos copiados, que se corrigieron con `COPY --chown`. La recompilación final se interrumpió por falta de espacio en el entorno Docker. **El contenedor final y su prueba de persistencia con volumen quedan pendientes de ejecutar en un entorno con espacio suficiente.** Esto no afecta a las verificaciones locales de SSR, API, SQLite y NASA ya aprobadas.
- No se desplegó el servicio Cloud Run ni se subió código a un repositorio GitHub. La conexión GitHub devolvió cero repositorios accesibles al intentar identificarlos.
- La persistencia local de SQLite fue comprobada entre instancias de la aplicación. La persistencia de un archivo SQLite en Cloud Run no está resuelta por el contenedor.
- Pytest muestra un aviso de deprecación del cliente de pruebas Starlette/httpx de las versiones instaladas; no produce fallos. Vite informa imports de React e íconos sin uso durante SSR; la compilación finaliza correctamente.

## Entorno de referencia

Python 3.12.14; Node 24.22.1 para comprobaciones locales; Node 22 para la compilación del contenedor. `frontend/package-lock.json` fija las dependencias JavaScript. `backend/requirements-tested.txt` registra las versiones Python usadas, además de los requisitos de instalación del proyecto.

El paquete de código excluye `.env`, bases SQLite, cachés, dependencias instaladas y credenciales.
