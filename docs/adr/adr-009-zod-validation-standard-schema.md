# ADR-009: Validación con Zod mediante Standard Schema

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- El formulario de contacto se valida en dos sitios: en la web (aviso inmediato al visitante) y en la API (la comprobación que protege).
- El manual §7.5 proponía `class-validator` con `whitelist`. `class-validator` depende de decoradores, `reflect-metadata` y clases: pesado para el bundle del sitio (RNF-01, Lighthouse > 90) y obliga a escribir las reglas dos veces.
- NestJS 12 admite **Standard Schema** de forma nativa: opción `schema` en `@Body/@Query/@Param` y `StandardSchemaValidationPipe`. El pipe global solo valida los parámetros que declaran `schema`.
- La regla del manual §7.4: la API no devuelve texto para el visitante, solo un `code` estable.

## Decisión

**Zod 4**, con los esquemas en `packages/shared`, compartidos entre la web y la API ([backend-research-definition §2.1](../architecture/backend-research-definition.md)):

- `z.strictObject` en toda entrada (rechaza campos no esperados) y `max()` en todo texto y lista (reglas D3 y D4).
- **Los esquemas devuelven códigos, no frases** (por ejemplo `EMAIL_INVALID`); `packages/shared/src/messages/es.ts` los traduce para la web. Desaparece la excepción de «mensajes ya en español».
- La configuración del entorno también se valida con Zod al arrancar (`ConfigModule` con `validationSchema`).
- No se usa `class-validator`.

**Riesgo y control:** la generación de OpenAPI con Standard Schema (`@nestjs/swagger` 12 con `standardSchemaConverter`) solo se vio en un espejo de las notas de versión. Una prueba en `feat/api-foundation` comprueba que `openapi.json` incluye el cuerpo del formulario de contacto; si falla, se reevalúa.

## Alternativas consideradas

- **`class-validator` con clases en `packages/shared`.** Descartada: decoradores pesados en el navegador y reglas duplicadas.
- **Valibot 1.x.** Alternativa válida (el bundle más pequeño, también vía Standard Schema); queda como opción si el bundle aprieta.
- **`nestjs-zod`.** Descartada: parchea internals de Swagger (su propio README avisa de roturas) y Nest 12 la vuelve innecesaria.

## Consecuencias

**Positivas**
- Una sola definición de cada regla, ligera en la web (`zod/mini` es tree-shakable).
- Errores de validación con `code` estable, que encajan con RFC 9457 (ADR-013).

**Negativas**
- Dependencia de una integración reciente (Standard Schema en Nest 12 y su conversión a OpenAPI), cubierta por la prueba del contrato (G6).
- `packages/shared/src/errors/codes.ts` es un fichero compartido que el orquestador integra rama por rama.

## Cuándo revisarla

- Si la prueba del `openapi.json` falla o el converter no cubre los esquemas.
- Si el peso de Zod en la web impide cumplir RNF-01 (evaluar Valibot).

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§2.1, §3.4)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§1.1, §1.6, §1.7)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§7.4, §7.5)
- NestJS, validación: https://docs.nestjs.com/techniques/validation · configuración: https://docs.nestjs.com/techniques/configuration (consultadas el 2026-10-24)
- Zod mini: https://zod.dev/packages/mini (consultada el 2026-10-24)
- Release de `@nestjs/swagger` 12.0.0 (espejo): https://newreleases.io/project/github/nestjs/swagger/release/12.0.0 (consultada el 2026-10-24)
