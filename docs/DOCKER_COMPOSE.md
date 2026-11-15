# Abrir AgroShift con Docker Compose

El archivo `compose.yaml` carga el `.env` de la raíz con `env_file`. No copia las claves a la imagen. El `.env` debe estar al lado de `compose.yaml` y llamarse exactamente `.env`, no `.env.txt`.

## 1. Actualizar los archivos

Si clonaste el repositorio, ejecutá `git pull` desde su carpeta. Si descargaste un ZIP, descargá la versión nueva y conservá tu `.env` privado en la raíz actualizada. El archivo nuevo que necesitás es `compose.yaml`.

## 2. Completar las tres credenciales en tu .env

Si el `.env` ya tiene tus datos, conservá ese archivo. Si todavía no existe, copiá `.env.example` con:

```powershell
Copy-Item .env.example .env
```

Abrilo con:

```powershell
notepad .env
```

Completá los valores de estas tres variables existentes:

- `WEB_USERNAME`: el usuario que vas a usar para entrar.
- `WEB_PASSWORD`: una contraseña de al menos 12 caracteres.
- `API_INTERNAL_TOKEN`: una clave interna aleatoria de al menos 32 caracteres. Node y FastAPI reciben la misma clave desde Compose.

Para generar una clave en tu computadora:

```powershell
py -3.12 -c "import secrets; print(secrets.token_hex(32))"
```

Copiá los 64 caracteres generados como valor de `API_INTERNAL_TOKEN`. No compartas esa clave, la contraseña ni capturas del `.env`. Guardá el archivo y cerrá el Bloc de notas.

Si un valor incluye `$`, `#` o espacios, usá comillas simples alrededor del valor en `.env`. Evitá definir estas mismas variables con otros valores en PowerShell: las variables del entorno del proceso tienen prioridad sobre la interpolación de `.env` de Compose.

## 3. Encender con un comando

Abrí Docker Desktop y esperá a que esté listo. Desde PowerShell, en la carpeta del proyecto:

```powershell
docker compose up -d --build
```

La primera vez instala y compila las dependencias. Luego abrí:

**http://localhost:8080**

La página de inicio de sesión pedirá el usuario y contraseña definidos en tu `.env`. No necesitás iniciar Python y Node en dos ventanas cuando usás Compose: ambos están dentro de un único contenedor.

Si cambiaste credenciales en `.env`, aplicalas con:

```powershell
docker compose up -d --force-recreate
```

Un simple `docker compose restart` no vuelve a crear las variables del contenedor.

## 4. Comprobar que arrancó

```powershell
docker compose ps
docker compose logs --tail=80 agroshift
```

El estado debe pasar a `healthy`. El endpoint `http://localhost:8080/healthz` informa el estado básico de Node y FastAPI. Si Compose dice que falta una variable, revisá su nombre y que tenga un valor no vacío. Si la aplicación informa longitud insuficiente, corregí la contraseña o la clave y recreá el contenedor.

No compartas la salida de `docker compose config` sin filtrar: contiene las credenciales interpoladas. Para validar sin imprimirlas podés usar `docker compose config --quiet`.

## Qué datos se toman del .env

Compose pasa las variables del `.env` al proceso. Las credenciales y opciones NASA se usan con sus valores configurados. Estas cinco opciones se fijan deliberadamente para el funcionamiento dentro de Docker:

| Variable | Valor dentro del contenedor | Motivo |
|---|---|---|
| APP_ENV | production | Acceso protegido de equipo |
| HOST | 0.0.0.0 | Recibir conexiones desde el puerto publicado |
| PORT | 8080 | Puerto del servidor web del contenedor |
| API_BASE_URL | http://127.0.0.1:8000 | FastAPI corre dentro del mismo contenedor en el puerto 8000 |
| DATABASE_PATH | /data/agroshift.sqlite3 | Guardar SQLite dentro del volumen persistente |

Los valores locales anteriores, como `API_BASE_URL=http://127.0.0.1:8001`, se conservan en tu archivo para el desarrollo con PowerShell, pero no deben usarse dentro del contenedor. El puerto de tu navegador se cambia con `AGROSHIFT_PORT`; por defecto es 8080. Si otro contenedor ya usa 8080, detenelo desde Docker Desktop o elegí otro valor, por ejemplo 8081, y recreá este servicio.

## Datos de SQLite

El volumen `agroshift-data` conserva las parcelas cuando recreás este servicio. Para detenerlo:

```powershell
docker compose down
```

No agregues `-v`: esa opción elimina el volumen y las parcelas. El volumen se inicializa vacío la primera vez; Compose no importa automáticamente una base de datos que hayas usado antes en Windows o en otro contenedor. Este volumen local no resuelve la persistencia de Cloud Run.

El puerto se publica solo en la computadora local. El acceso desde otros equipos y el despliegue remoto se deben configurar por separado.

## Archivos Compose equivalentes y red local

`compose.yaml` y `docker-compose.yml` contienen la misma configuración, para que el arranque automático y `docker compose -f docker-compose.yml` funcionen igual. Se mantiene el volumen y el nombre de proyecto existentes. `AGROSHIFT_HOST_IP` permite elegir la interfaz; su valor predeterminado es `127.0.0.1`. Para red local usá `0.0.0.0` y abrí la IP de la computadora anfitriona desde los demás dispositivos. El navegador puede requerir HTTPS para habilitar GPS desde otro dispositivo.
