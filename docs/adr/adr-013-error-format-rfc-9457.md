# ADR-013: Formato de errores RFC 9457 (400 y 422)

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- El manual §7.5 pide un único formato de error (`application/problem+json`, RFC 9457) que nunca filtre trazas ni detalles internos, y §7.4 exige que la API devuelva un `code` estable en inglés, no texto para el visitante.
- RFC 9457: los miembros `type`, `status`, `title`, `detail` e `instance` son opcionales; `type` vale `about:blank` por defecto; se permiten extensiones (como `code`); el ejemplo de validación usa **422** con `errors[]`.
- NestJS devuelve **400** por defecto en los errores de validación; Nest 12 añade `errorCode` en `HttpExceptionOptions`.
- Pregunta abierta de la investigación (G11): 400 o 422 para la validación.

## Decisión

Todas las respuestas de error usan **`application/problem+json`** ([backend-research-definition §3.6](../architecture/backend-research-definition.md)):

- Siempre un `code` estable en inglés y un `traceId`.
- Los errores de validación devuelven `errors[]` con `pointer` y `code` (por ejemplo `{ pointer: '/email', code: 'EMAIL_INVALID' }`), usando el catálogo de `packages/shared`.
- **400** para JSON mal formado y **422** para datos bien formados pero inválidos.
- Nunca se devuelven trazas ni detalles internos; el detalle va al log (ADR-014).

Implementación prevista ([backend-research §1.5](../architecture/backend-research.md)): un `ProblemDetailsFilter` global que traduce `DomainError` propios, `HttpException` de Nest, `ThrottlerException` (429 `RATE_LIMITED`), los errores del `StandardSchemaValidationPipe` (vía `exceptionFactory`), errores conocidos de Prisma (`P2002` → 409, `P2025` → 404) y cualquier otro error (500 `INTERNAL_ERROR` con `detail` genérico).

## Alternativas consideradas

- **400 para toda validación** (valor por defecto de Nest). Descartada: no distingue un cuerpo ilegible de datos inválidos.
- **Formato de error propio o el de Nest por defecto.** Descartada: el manual exige un formato estándar único.
- **Result/Either en todo el código.** Descartada: más ceremonia sin beneficio; se usan errores de dominio tipados y un filtro.

## Consecuencias

**Positivas**
- Contrato de errores estándar y estable; la web traduce por `code` sin parsear texto.
- Ninguna fuga de detalles internos en las respuestas.

**Negativas**
- Un filtro global que mapea varias familias de errores; hay que cubrirlo con pruebas.
- Hay que configurar el `exceptionFactory` para separar 400 de 422, ya que no es el comportamiento por defecto.

## Cuándo revisarla

- Si se publica una nueva versión de la RFC o un cliente necesita `type` documentados (`https://<dominio>/problemas/<code>`).

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§3.6, §6 G11)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§1.1, §1.5, §B)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§7.4, §7.5)
- RFC 9457: https://www.rfc-editor.org/rfc/rfc9457.html (consultada el 2026-10-24)
- NestJS, validación: https://docs.nestjs.com/techniques/validation · migración a v12: https://docs.nestjs.com/migration-guide (consultadas el 2026-10-24)
