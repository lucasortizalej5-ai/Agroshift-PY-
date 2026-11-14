# Plan de implementación

## Etapa 1 — circuito mínimo funcional: implementada

SSR de React, registro y edición de parcelas en Alto Paraná, Leaflet, SQLite, NASA POWER real, procedencia de cada consulta, faltantes y opciones iniciales por reglas de diversificación. Pruebas de cálculo, endpoints, caché, errores y SSR. Documentación Windows y preparación del contenedor.

Criterio de aceptación: crear una parcela desde el navegador, consultar NASA, ver el cultivo anterior afectar las opciones y recargar la página manteniendo datos en SQLite y HTML SSR. El script integral verifica el circuito HTTP con una base temporal; la revisión visual en diferentes dispositivos sigue pendiente.

## Etapa 2 — validación de rotaciones y calendario local

Revisar con un profesional local el catálogo, variedades, épocas de siembra, duración de ciclos y restricciones. Incorporar objetivos y disponibilidad de recursos del productor. Definir reglas versionadas y casos de prueba con ejemplos revisados. No convertir un principio de alternancia en una garantía universal.

Criterio: cada regla nueva tiene fuente, alcance, excepciones, responsable de validación y una prueba; los datos históricos se distinguen de los supuestos del futuro.

## Etapa 3 — riego orientativo

Usar un método de evapotranspiración documentado —por ejemplo FAO-56 cuando existan las variables necesarias—, coeficientes por cultivo y etapa, precipitación efectiva y eficiencia del sistema. Incorporar fecha real de siembra, características hídricas y registro de riegos. Identificar qué entradas son medidas y cuáles asumidas.

Mostrar mm y, si se conoce el área, volumen aproximado. Un tiempo de riego exige caudal y superficie abastecida. No implementado en la etapa 1.

## Etapa 4 — orientación nutricional

Carga de análisis de suelo con unidad, método, fecha y laboratorio; reglas locales revisadas por un profesional. Sin esos datos, orientación sobre qué medir y qué falta. No prescribir dosis solamente a partir de pH o datos satelitales.

## Etapa 5 — riesgos climáticos

Separar indicadores retrospectivos, condiciones recientes y pronósticos de una fuente apropiada. Validar umbrales por cultivo y etapa; considerar GPM para precipitación y SMAP para contexto hídrico. No llamar “alerta” a un promedio histórico ni inferir probabilidades de sequía sin metodología.

## Etapa 6 — ventanas de cosecha

Usar fecha real de siembra, variedad, etapas y, cuando exista una metodología validada, tiempo térmico. Mostrar rangos y supuestos; no prometer fechas exactas. La climatología no es el clima futuro que experimentará el cultivo.

## Etapa 7 — piloto de uso real y despliegue durable

Autenticación y autorización por productor; respaldo y recuperación; persistencia durable; acceso desde distintos dispositivos; prueba con productores y técnicos; política de conservación de datos. Si se conserva SQLite, elegir una infraestructura compatible con archivo persistente y una sola autoridad de escritura. Antes de escalar, resolver concurrencia y aislamiento.

El modo sin conexión completo y la ampliación nacional requieren trabajo adicional. En esta etapa se puede consultar una respuesta guardada cuando falte internet, siempre que Node y FastAPI locales estén ejecutándose; no se implementó una PWA que funcione sin esos servidores.
