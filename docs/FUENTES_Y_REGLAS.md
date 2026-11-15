# Fuentes, cálculos y límites

## NASA POWER: integración real

Se utiliza el servicio diario oficial:

`https://power.larc.nasa.gov/api/temporal/daily/point`

Parámetros: `community=AG`, `format=JSON`, `time-standard=LST`, coordenadas y fechas `YYYYMMDD`. No requiere credenciales. La aplicación conserva URL, período, fecha UTC de consulta, fuentes declaradas por NASA y versión de API cuando están disponibles.

| Parámetro | Significado | Resumen |
|---|---|---|
| T2M | Temperatura media del aire a 2 m | Media de los días válidos, °C |
| T2M_MAX | Temperatura máxima diaria a 2 m | Serie diaria; resumen interno de medias de máximas, °C |
| T2M_MIN | Temperatura mínima diaria a 2 m | Serie diaria; resumen interno de medias de mínimas, °C |
| PRECTOTCORR | Precipitación corregida diaria, mm/día | Suma sobre días de un día de duración, expresada en mm; solo se muestra total con cobertura completa |
| RH2M | Humedad relativa del aire a 2 m | Media de días válidos, %; no es humedad del suelo |

Los cálculos aritméticos son `media = suma / cantidad de días válidos` y `lluvia acumulada = suma de la tasa diaria × 1 día`. Los indicadores conservan `valid_days`, `expected_days`, `complete`, `unit` y `aggregation`. Las temperaturas máximas y mínimas agregadas no se presentan como extremos absolutos del período.

El valor de relleno de NASA, `-999`, valores no numéricos o no finitos, humedad fuera de 0–100 % y precipitación negativa se convierten en **faltantes**, no en cero. No interpolamos. La suma disponible parcial queda identificada internamente y el total del período aparece como no disponible si falta un día. Si toda la serie está ausente, se devuelve un error identificable.

La fuente meteorológica puede variar por fecha entre productos MERRA-2 y de baja latencia. Guardamos `upstream_sources` del proveedor. La resolución meteorológica aproximada es **0,5° latitud × 0,625° longitud**. La información procede de modelos y asimilación de observaciones, incluidas observaciones satelitales; no es una lectura directa de nutrientes ni un sensor de la parcela.

Fuentes oficiales consultadas:

- [NASA POWER Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/).
- [NASA POWER: meteorología, fuentes y validación](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/).
- [NASA POWER: servicios y resolución](https://power.larc.nasa.gov/docs/services/).

## Reglas iniciales de rotación

El catálogo está en `backend/app/services/rotation.py`:

| Cultivo | Especie de referencia | Familia |
|---|---|---|
| Soja | Glycine max | Fabaceae |
| Maíz | Zea mays | Poaceae |
| Trigo | Triticum aestivum | Poaceae |
| Mandioca | Manihot esculenta | Euphorbiaceae |
| Poroto | Phaseolus vulgaris | Fabaceae |

La especie de referencia de “poroto” es **Phaseolus vulgaris**. Un nombre común puede referirse a otra especie; no generalizar este catálogo sin corregir su identificación. Se puede verificar taxonomía en [Kew Plants of the World Online](https://powo.science.kew.org/).

`ROT-01` no prioriza repetir inmediatamente el mismo cultivo. `ROT-02` usa la alternancia de familia botánica como un filtro inicial conservador de diversificación. El [USDA NRCS National Agronomy Manual, Part 503](https://www.nrcs.usda.gov/sites/default/files/2022-10/National-Agronomy-Manual.pdf) describe evitar sucesión inmediata del mismo cultivo y alternar familias como principios de rotación. Es una referencia general; no es un calendario paraguayo ni valida automáticamente las opciones del MVP.

La [FAO](https://www.fao.org/conservation-agriculture/en/) describe la diversificación de especies dentro de la agricultura de conservación. [NASA Earth Observatory: How to Rotate Crops](https://science.nasa.gov/earth/earth-observatory/how-to-rotate-crops-154601/) aporta contexto de investigación sobre rotación y variabilidad de resultados. Ninguna de estas fuentes constituye una prescripción local para una parcela paraguaya.

El MVP devuelve **opciones del mismo nivel**, no “el mejor cultivo”. Explica cada alternativa, registra los descartes y enlaza las fuentes. El cultivo anterior afecta las opciones; el clima observado aporta contexto y no genera por sí solo un diagnóstico de suelo o una predicción.

Faltan variedad, ventanas locales validadas, historial sanitario, características hídricas, análisis nutricional, maquinaria y objetivo económico. No producimos puntuaciones, promesas de rendimiento, calendarios inventados ni dosis. Cambiar de familia tampoco garantiza cortar todos los ciclos de plagas.

## Geometría y mapas

Área aproximada circular: `ha = π × radio_m² / 10.000`. El radio no representa los límites legales ni un levantamiento topográfico.

El archivo `alto-parana.geojson` se extrajo de [geoBoundaries PRY ADM1](https://www.geoboundaries.org/api/current/gbOpen/PRY/ADM1/). Fuente declarada: Dirección General de Estadística, Encuestas y Censos; año representado 2012; licencia **CC BY 4.0**. Usamos geometría simplificada. Comprobamos centro y 64 puntos de la circunferencia; es un control aproximado del piloto y puede no capturar detalles menores del límite.

Mapa base de la versión actualizada: Google Maps, a través de la capa Leaflet incluida en el ZIP. La atribución se muestra en el mapa. geoBoundaries sigue aportando el límite departamental. La información meteorológica continúa consultándose en NASA POWER.

Fotografía ilustrativa: [Unsplash](https://unsplash.com/license), recurso `photo-1500382017468-9049fed747ef`. La imagen no identifica una parcela del usuario. El ícono de AgroShift se dibujó para este proyecto.

## Evaluación de GPM y SMAP: próximos conectores

| Fuente | Aporte potencial | Requisitos y límites | Decisión para este MVP |
|---|---|---|---|
| GPM IMERG | Precipitación en grilla de aproximadamente 0,1°, con productos de media hora y agregaciones | Elegir Early, Late o Final; conservar versión, calidad y latencia; verificar unidades antes de acumular; evitar mezclarlo silenciosamente con POWER | Evaluado, sin integrar todavía |
| SMAP L4 | Humedad del suelo superficial y zona de raíces, producto de aproximadamente 9 km y 3 horas | Es un producto de asimilación; requiere selección de versión, acceso Earthdata cuando corresponda, formatos geoespaciales y validación regional. No mide N, P, K ni fertilidad | Evaluado, sin integrar todavía |

Referencias: [NASA GPM IMERG](https://gpm.nasa.gov/data/imerg), [documentación IMERG V07](https://gpm.nasa.gov/resources/documents/imerg-v07-technical-documentation), [NASA SMAP L4](https://data.nasa.gov/dataset/smap-l4-global-3-hourly-9-km-ease-grid-surface-and-root-zone-soil-moisture-geophysical-dat-c9db0) y [NSIDC SMAP L4 versión 8](https://doi.org/10.5067/T5RUATAQREF8). La versión se debe confirmar antes de implementar el conector; el MVP no afirma consumir estos productos.
