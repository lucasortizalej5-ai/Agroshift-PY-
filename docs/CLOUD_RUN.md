# Preparación para Cloud Run y GitHub

## Destino recibido

`https://team-raizen-ssr-cuzwnbtlga-ue.a.run.app/`

La inspección de esa URL mostró la página inicial de Google Cloud y los siguientes identificadores públicos:

- Servicio: `team-raizen-ssr`.
- Región: `us-east1`.
- Proyecto: `nasaspaceapps-474216`.

Estos datos públicos no conceden acceso a la cuenta ni permiten recuperar el código. **No se modificó ni se desplegó ese servicio desde esta implementación.** El repositorio identificado es https://github.com/lucasortizalej5-ai/Agroshift-PY-. La autorización de GitHub permite integrar el código; para desplegar en Google Cloud se necesita acceso autorizado independiente.

## Cómo integrar el código en el repositorio real

1. Repositorio confirmado: `https://github.com/lucasortizalej5-ai/Agroshift-PY-`. Se inspeccionó y estaba vacío.
2. Clonar y revisar README, estructura, ramas y cambios existentes.
3. Crear una rama de trabajo e integrar los archivos de este MVP sin reemplazar trabajo ajeno a ciegas.
4. Instalar, ejecutar pruebas y compilar SSR.
5. Revisar `git diff`, `git status` y archivos ignorados. No agregar `.env`, bases de datos ni credenciales.
6. Subir la rama y abrir una revisión. El workflow incluido ejecuta las pruebas sin credenciales NASA.

No se inventó una URL remota ni se publicó a un repositorio distinto del solicitado.

## Contenedor

`Dockerfile` compila cliente y servidor React. La imagen final contiene Python, Node, FastAPI y un supervisor que administra ambos procesos. Node escucha el `PORT` requerido por Cloud Run; FastAPI solo escucha `127.0.0.1:8000` dentro del contenedor. El proceso no corre como root.

Preparar un archivo privado de variables a partir de `.env.example`. Para el contenedor:

```dotenv
APP_ENV=production
HOST=0.0.0.0
PORT=8080
DATABASE_PATH=/data/agroshift.sqlite3
API_BASE_URL=http://127.0.0.1:8000
WEB_USERNAME=equipo
WEB_PASSWORD=<contraseña larga de al menos 12 caracteres>
API_INTERNAL_TOKEN=<secreto aleatorio de al menos 32 caracteres>
```

Los textos entre `<...>` son marcadores; deben reemplazarse en un archivo privado, nunca en el código ni en Git. Se pueden generar valores con un gestor de contraseñas. No se incluye una contraseña predeterminada.

Para una prueba local con Docker, guardar esas variables en un archivo `.env.docker` privado de la raíz:

```powershell
docker build -t agroshift-py:local .
docker volume create agroshift-local-data
docker run --rm -p 127.0.0.1:8080:8080 --env-file .env.docker -v agroshift-local-data:/data agroshift-py:local
```

En Linux, Docker puede crear el volumen inicialmente con propietario root. Si hay un error de permisos, un administrador debe asignar el volumen al UID/GID 10001 usado por la imagen; no hacer el contenedor público ni desactivar el acceso protegido para corregirlo. La prueba del contenedor se realiza también sin volumen para verificar arranque y SSR, usando datos temporales.

Abrir `http://127.0.0.1:8080`. El navegador solicita las credenciales de equipo. El endpoint `/healthz` devuelve únicamente un estado básico y comprueba la conexión con FastAPI.

Para comprobar SSR, acceso protegido y persistencia al reemplazar el contenedor con el mismo volumen **local**:

```powershell
.\backend\.venv\Scripts\python.exe scripts\smoke_container.py
```

El script crea y elimina su propio volumen y usa secretos aleatorios efímeros, sin imprimirlos. No usa datos del productor. Si una red corporativa requiere una CA adicional durante la compilación, el Dockerfile admite el secreto opcional BuildKit `build_ca`; se monta únicamente durante la instalación y no se copia a la imagen. No desactivar TLS para instalar dependencias.

## Desplegar posteriormente al servicio

1. Iniciar sesión con Google Cloud CLI y seleccionar una cuenta que tenga permisos sobre el proyecto confirmado.
2. Confirmar en la consola el nombre, región, permisos y variables del servicio existente antes de reemplazar su revisión.
3. Crear los secretos privados `API_INTERNAL_TOKEN`, `WEB_USERNAME` y `WEB_PASSWORD` mediante Secret Manager. Dar acceso solo a la identidad que ejecuta el servicio.
4. Compilar o subir la imagen usando el procedimiento del proyecto. Cloud Run debe dirigir tráfico al puerto 8080.
5. Configurar `APP_ENV=production`, `HOST=0.0.0.0`, `DATABASE_PATH=/data/agroshift.sqlite3` y `API_BASE_URL=http://127.0.0.1:8000`. Inyectar los valores secretos desde Secret Manager.
6. Para una demostración temporal, limitar a una instancia y concurrencia reducida. **Esto no vuelve durable a SQLite**. Mostrar que es una demo con datos temporales y no registrar información productiva insustituible.
7. Verificar `/healthz`, acceso protegido, HTML SSR, registro, consulta NASA y persistencia durante la revisión actual. Decidir explícitamente la política IAM del servicio; no cambiarla automáticamente para publicar.

No se incluye un comando que envíe contraseñas como argumentos ni uno que altere automáticamente el acceso del servicio.

## SQLite y persistencia: decisión pendiente de producción

El [contrato de ejecución de Cloud Run](https://docs.cloud.google.com/run/docs/container-contract) explica que el sistema de archivos escribible de una instancia no persiste al detenerse. Un despliegue o reinicio puede borrar la base; varias instancias pueden tener archivos distintos.

Para conservar **SQLite como archivo** en uso real, una opción sencilla es alojar el sistema en una máquina con disco persistente, respaldo y una única autoridad de escritura. Usar un servicio SQLite remoto requiere un conector específico y revisar sus garantías; no está implementado. Otra alternativa es cambiar a una base transaccional gestionada, lo que modifica el requisito actual de SQLite.

No recomendamos montar un archivo SQLite directamente sobre Cloud Storage FUSE. Las diferencias de semántica y bloqueos deben resolverse mediante una arquitectura compatible, no con una bandera de una sola instancia.

## Estado de entrega

Código local, compilación SSR y pruebas automatizadas preparados. La verificación real de NASA se registra en `VERIFICACION.md`. El repositorio remoto confirmado es `lucasortizalej5-ai/Agroshift-PY-`. El despliegue en el servicio recibido permanece pendiente de disponer de acceso autorizado al proyecto de Google Cloud.
