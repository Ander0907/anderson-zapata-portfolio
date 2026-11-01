# ADR-014: Registro de eventos con pino

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- El manual §7.5 pide registro estructurado (JSON) con identificador de correlación, sin datos personales ni secretos.
- `ConsoleLogger({ json: true })` de Nest emite `level`, `pid`, `timestamp`, `message` y `params`, pero **no** añade contexto de petición (la correlación es función de `@nestjs/observe`). La propia documentación recomienda Pino o Winston si se necesita redacción de campos o serializadores.
- Cloud Run necesita `severity` y `logging.googleapis.com/trace` = `projects/<P>/traces/<TRACE_ID>` (sacado de `X-Cloud-Trace-Context`) para correlacionar con el log de la petición.
- El formulario de contacto recibe datos personales (nombre, correo, mensaje).

## Decisión

**`nestjs-pino`** ([backend-research-definition §2.7](../architecture/backend-research-definition.md); versión 5.3.1 con peer `@nestjs/* ^11 || ^12` según la investigación):

- Nivel como `severity` en mayúsculas.
- Identificador de petición: el de Google si existe (o un `X-Request-Id`), si no uno nuevo con `randomUUID()`.
- Campo de traza de Cloud Run.
- **Ocultación** (`redact`) de cookie, `authorization` y campos personales del formulario.
- **No se registran cuerpos de petición** (regla D13).
- El detalle de los errores 500 (incluida la traza) va al log, nunca a la respuesta (ADR-013).

## Alternativas consideradas

- **`ConsoleLogger({ json: true })` de Nest.** Descartada: sin `severity` para Cloud Logging, sin id por petición y sin redacción.
- **`ConsoleLogger` JSON más un interceptor propio con `AsyncLocalStorage`.** Descartada: reimplementa lo que pino ya trae.
- **Registrar todo y filtrar después.** Descartada: expone datos personales.

## Consecuencias

**Positivas**
- Logs correlacionados con las peticiones en Cloud Logging, con la gravedad correcta.
- Datos personales y secretos fuera de los logs por configuración.

**Negativas**
- Una dependencia más, que debe seguir declarando soporte para Nest 12 (G5).
- Al no registrar cuerpos, depurar un error de entrada requiere reproducirlo o apoyarse en los `code` de validación.

## Cuándo revisarla

- Si `nestjs-pino` deja de mantenerse o no soporta la siguiente versión mayor de Nest.
- Si el logger integrado de Nest llega a cubrir `severity`, correlación y redacción.

## Actualización (2026-11-01)

La decisión se mantiene. Se concretan estos puntos:

- **Gravedad explícita.** La correspondencia con Cloud Logging es un mapa fijo: `trace` → `DEBUG`, `warn` → `WARNING`, `fatal` → `CRITICAL`. Pasar el nivel de pino en mayúsculas no siempre da un valor válido.
- **Serializadores con lista de permitidos.** Solo se registran `id`, `method`, la ruta sin query string, `urlTruncated` cuando procede y `statusCode`. Así no se registran cabeceras ni query strings.
- **URL acotada.** Tras quitar la query string, `req.url` se recorta a 2048 caracteres y se añade `urlTruncated: true`. Una URL de hasta 2048 caracteres no lleva ese campo.
- **Montaje de `pino-http`.** Se monta el primero en `configureApp`, y `LoggerModule` usa `useExisting: true` para no montarlo dos veces y duplicar los logs. Lo que Node rechaza antes de llegar a Express (HTTP inválido, cabeceras excesivas) no pasa por este middleware.
- **Identificador de petición.** Se genera en `genReqId`.
- **Peticiones rechazadas por el parser de cuerpo.** Se registran dos entradas: un WARNING, sin el cuerpo, y la línea de cierre `request completed`.
- **Errores 500.** También son dos entradas: un ERROR (`Request failed`) y la línea de cierre (`request errored`, con gravedad `INFO`). La segunda entrada ERROR también se escribe cuando las cabeceras ya se enviaron y el status es 4xx (método `log` de `problem-details.filter.ts`).

Estas dos entradas por petición se conservan, por decisión de Anderson (2026-11-01).

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§2.7, §3.4 D13)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§0, §1.7, G5)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§7.5)
- NestJS, logger: https://docs.nestjs.com/techniques/logger (consultada el 2026-10-24)
- Cloud Run, logging: https://docs.cloud.google.com/run/docs/logging (consultada el 2026-10-24)
