# AgroShift PY

**Del espacio a tu tierra.** MVP de apoyo a decisiones agrícolas para Alto Paraná, Paraguay, preparado para demostrar el circuito completo con datos reales de NASA POWER.

Este proyecto contiene **React + Vite + Tailwind CSS, renderizado en servidor (SSR) mediante Node, FastAPI y SQLite**. No es únicamente una maqueta. El navegador se conecta al servidor SSR; ese servidor deriva las consultas a FastAPI, que guarda las parcelas y consulta NASA.

## Qué está implementado en esta primera etapa

- Dashboard adaptable a celulares y computadoras, en español.
- Registro, edición, selección y eliminación de varias parcelas.
- Leaflet y OpenStreetMap: selección por mapa, GPS, coordenadas y radio de 50 a 2.000 metros.
- Validación del centro y del contorno circular dentro del límite aproximado de Alto Paraná.
- Cultivo anterior: soja, maíz, trigo, mandioca y poroto.
- Observaciones de textura, drenaje, pH medido y fecha del análisis. Se guardan sin convertirlas en diagnósticos.
- Consulta **real** a NASA POWER Daily API, con fechas elegibles y sin API key.
- Temperatura media, máxima y mínima; precipitación corregida; humedad relativa del aire.
- Gráfico y tabla de los datos diarios. Fuente, fecha de consulta, unidades, días válidos y avisos de datos faltantes.
- SQLite para parcelas, última consulta de cada parcela y caché NASA. La misma consulta se reutiliza durante 24 horas; una copia anterior utilizada por falla de NASA se identifica como tal.
- Opciones iniciales de rotación mediante reglas explícitas y fuentes consultables.
- Descarga del informe inicial como archivo de texto.
- Pruebas del backend, cálculos, errores de proveedor, persistencia, SSR y seguridad de la serialización.
- Contenedor preparado para Cloud Run, con acceso de equipo protegido.

**Todavía no implementamos prescripciones de riego, dosis de fertilización, alertas climáticas ni ventanas de cosecha.** Se dejan para la próxima etapa solicitada, después de validar este circuito mínimo. No aparecen números simulados para aparentar esas funciones.

## Antes de empezar en Windows

Necesitás:

1. **Python 3.12**, instalado desde [python.org](https://www.python.org/downloads/windows/).
2. **Node.js 22.12 o posterior** (recomendado: Node 22 LTS), desde [nodejs.org](https://nodejs.org/).
3. **Git**, desde [git-scm.com](https://git-scm.com/download/win), si vas a usar un repositorio.
4. Conexión a internet para instalar dependencias, cargar mapas y consultar NASA. Una consulta guardada se puede volver a leer sin internet mientras los servidores locales sigan funcionando.

No necesitás instalar SQLite por separado: Python ya lo incluye.

## Ejecutar con Docker Compose

Si ya usás Docker Desktop, podés iniciar el sistema completo con `docker compose up -d --build`. El nuevo `compose.yaml` carga las credenciales de tu `.env`, configura los puertos internos y conserva SQLite en un volumen. Primero completá `WEB_USERNAME`, `WEB_PASSWORD` (12+ caracteres) y `API_INTERNAL_TOKEN` (32+ caracteres) en tu `.env`.

Abrí **http://localhost:8080**. Si modificás `.env`, ejecutá `docker compose up -d --force-recreate` para aplicar los cambios. Instrucciones completas: [DOCKER_COMPOSE.md](docs/DOCKER_COMPOSE.md).

Las instrucciones siguientes con dos terminales son otra forma de ejecutar el proyecto, sin Docker.

## Instalar y ejecutar: dos terminales de PowerShell

Descomprimí el proyecto. Abrí PowerShell **dentro de la carpeta que contiene este README**. Si recibiste un repositorio GitHub, primero clonalo y entrá a esa carpeta; la dirección de Cloud Run no se usa con `git clone`.

En la primera terminal:

```powershell
Copy-Item .env.example .env
py -3.12 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Dejá esa terminal abierta: está ejecutando FastAPI. No hace falta activar el entorno virtual; así evitamos problemas con la política de ejecución de PowerShell.

En una **segunda terminal**, ubicada en la misma carpeta raíz:

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev
```

Abrí **http://127.0.0.1:5173/**. La página llega renderizada desde el servidor y React la vuelve interactiva. La API está en **http://127.0.0.1:8000/api/docs** durante el desarrollo local.

Para detener el sistema, presioná `Ctrl+C` en ambas terminales.

### En Linux o macOS

```bash
cp .env.example .env
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

En otra terminal: `npm --prefix frontend ci` y `npm --prefix frontend run dev`.

## Recorrido para presentar al jurado

1. Abrí el dashboard. Inicialmente no hay parcelas ni mediciones inventadas.
2. Presioná **Nueva parcela**.
3. Seleccioná un punto dentro de Alto Paraná. El punto inicial del mapa es una **referencia en Minga Guazú**, no la ubicación automática del usuario. El GPS se solicita solo si presionás el botón correspondiente.
4. Elegí el radio, nombrá la parcela e indicá el cultivo anterior. Por ejemplo, soja.
5. Si tenés un pH medido, agregá su valor y fecha. Si no, dejalo vacío.
6. Presioná **Guardar y consultar NASA**. Se guarda primero la parcela y luego se consulta el último período predeterminado de 30 días, finalizado hace 7 días.
7. Revisá las opciones de rotación. Después de soja, el filtro no prioriza soja ni poroto por repetición o familia compartida. Las demás opciones **no están ordenadas por aptitud**.
8. Entrá a **Clima y datos NASA**, revisá la tabla, cambiá el período y abrí la consulta original.
9. Recargá la página: la parcela sigue en SQLite y sus datos forman parte del HTML SSR.

Si NASA falla, la parcela queda guardada. Podés reintentar sin volver a registrarla. Sin datos previos de la misma consulta no se presenta un clima de reemplazo.

## Cómo interpretar los resultados

- **Información declarada:** ubicación, radio, cultivo anterior, textura, drenaje y mediciones ingresadas por el productor.
- **Estimaciones meteorológicas NASA:** datos reales del proveedor, derivados de modelos y asimilación de observaciones. No son mediciones de campo de la parcela.
- **Cálculos del sistema:** superficie circular, medias del período y precipitación acumulada cuando la serie está completa.
- **Reglas del MVP:** opciones por cambio de cultivo y familia botánica. El clima pasado se presenta como contexto, sin convertirlo en una predicción o en un puntaje de aptitud.
- **Simulaciones:** no se usan en la aplicación. Las pruebas automatizadas sí utilizan fixtures sintéticas identificadas, aisladas de la base de datos real.

NASA POWER meteorológico tiene una resolución aproximada de 0,5° × 0,625°. Parcelas vecinas pueden recibir valores iguales. La humedad relativa es del **aire**, no del suelo. No se puede deducir fertilidad nutricional a partir de estos parámetros. Ver [fuentes y reglas](docs/FUENTES_Y_REGLAS.md).

## Ejecutar las pruebas

Desde la raíz, en Windows:

```powershell
.\backend\.venv\Scripts\python.exe -m pytest -c backend\pytest.ini backend\tests
npm --prefix frontend run build
npm --prefix frontend test
.\backend\.venv\Scripts\python.exe scripts\smoke_system.py
```

El último comando inicia temporalmente ambos servidores con una **base de datos temporal** y comprueba el circuito SSR → proxy → FastAPI → SQLite. Los servidores normales pueden seguir abiertos: utiliza otros puertos.

Para agregar una prueba de consulta real a NASA, con internet:

```powershell
.\backend\.venv\Scripts\python.exe scripts\smoke_system.py --live
```

En Linux/macOS reemplazá `.\backend\.venv\Scripts\python.exe` por `backend/.venv/bin/python`.

## Compilación SSR de producción local

Con FastAPI ejecutándose:

```powershell
npm --prefix frontend run build
npm --prefix frontend start
```

El comando de compilación genera `frontend/dist/client` (JavaScript y CSS del navegador) y `frontend/dist/server` (React para generar el HTML). `start` usa esos archivos sin el servidor de desarrollo de Vite.

## Estructura y arquitectura

```text
frontend/
  server.mjs               Servidor SSR y proxy privado hacia FastAPI
  ssr-utils.mjs            Serialización segura y acceso protegido
  src/App.jsx              Dashboard y navegación
  src/components/          Mapa, formulario, clima y rotación
  src/entry-client.jsx     Hidratación de React en el navegador
  src/entry-server.jsx     Renderizado inicial de React en el servidor
  src/styles.css           Tailwind y estilos responsivos
  tests/                   Pruebas de SSR y seguridad
backend/
  app/main.py              Endpoints y validación de solicitudes
  app/database.py          Persistencia SQLite con consultas parametrizadas
  app/services/nasa.py     Consulta, normalización y caché NASA
  app/services/rotation.py Catálogo, reglas y explicaciones
  app/services/geo.py      Área y geocerca
  app/models.py            Modelos y validaciones
  tests/                   Pruebas automatizadas sin internet
scripts/                   Verificación integral y arranque del contenedor
docs/                      Arquitectura, fuentes, despliegue y etapas
```

Más detalle en [ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Datos privados y credenciales

- `.env`, bases SQLite, cachés, archivos de credenciales y dependencias quedan fuera de Git y del contexto Docker.
- Las claves del backend no se envían al navegador. El servidor SSR agrega el token interno al comunicarse con FastAPI.
- El desarrollo escucha solo en `127.0.0.1`. No hace falta una API key para NASA POWER.
- El contenedor de producción exige usuario y contraseña de equipo y un token interno. No implementa usuarios individuales ni aislamiento por agricultor; no está preparado para un lanzamiento público con datos de múltiples personas.
- Las respuestas con parcelas no se guardan en cachés públicas. El JSON incluido en SSR se serializa para impedir cierre de etiquetas `script` con texto ingresado por usuarios.
- No subas la base `backend/data/agroshift.sqlite3` ni el `.env` al repositorio. Para respaldar SQLite, detené los servidores y copiá la carpeta `backend/data` completa a un lugar privado.

## GitHub y el servicio Cloud Run proporcionado

Repositorio del proyecto: [lucasortizalej5-ai/Agroshift-PY-](https://github.com/lucasortizalej5-ai/Agroshift-PY-).

```powershell
git clone https://github.com/lucasortizalej5-ai/Agroshift-PY-.git
cd Agroshift-PY-
```

El repositorio fue inspeccionado antes de integrar el MVP y estaba vacío. La dirección `https://team-raizen-ssr-cuzwnbtlga-ue.a.run.app/` corresponde al destino Cloud Run. Subir código a GitHub y desplegar ese servicio son operaciones distintas. El procedimiento de despliegue está en [CLOUD_RUN.md](docs/CLOUD_RUN.md).

**SQLite en Cloud Run:** la escritura en el sistema de archivos del contenedor es temporal. Un servicio con una sola instancia no garantiza persistencia tras reiniciar o reemplazar el contenedor. La demo puede usar almacenamiento temporal identificado; el uso real necesita resolver almacenamiento durable y concurrencia antes de publicarse. No montes SQLite en Cloud Storage FUSE esperando bloqueos de archivos fiables.

## Problemas frecuentes

- **“El backend no está disponible”**: verificá que la primera terminal siga abierta y que `API_BASE_URL` sea `http://127.0.0.1:8000`.
- **No aparece el mapa**: revisá internet. Podés ingresar coordenadas manualmente; la validación final la hace el backend.
- **El GPS está fuera del piloto**: seleccioná un punto en Alto Paraná o reducí el radio si cruza el límite.
- **NASA no tiene datos recientes**: elegí un período anterior. No se presentan faltantes como cero.
- **Puerto ocupado**: detené la instancia anterior; si cambiás el puerto de FastAPI, actualizá `API_BASE_URL`.
- **Windows no reconoce `py` o `npm`**: instalá Python y Node, cerrá y volvé a abrir PowerShell.

## Próximas etapas

Ver [PLAN_DE_ETAPAS.md](docs/PLAN_DE_ETAPAS.md). Antes del uso productivo hacen falta validación agronómica local, autorización por usuario, respaldo durable y una prueba piloto con productores.

Proyecto independiente del equipo AgroShift PY. Usar datos NASA no implica aval de NASA.
