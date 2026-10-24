# ADR-018: Estrategia de pruebas con base de datos

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- El TDD es obligatorio y los módulos CRUD se prueban con PostgreSQL real, sin simular Prisma (ADR-017).
- Prisma recomienda para GitHub Actions un **service container** de PostgreSQL. Su guía con Docker Compose es anterior a v7. Testcontainers (`@testcontainers/postgresql`) ofrece `getConnectionUri()` y snapshots.
- En Windows, tanto Docker Compose como Testcontainers exigen Docker Desktop.
- Las pruebas nunca deben tocar la base de Neon (ADR-019).
- La inyección por tipo de Nest bajo Vitest necesita metadatos de decoradores (riesgo G7). Resuelto sin `unplugin-swc`: verificado el 2026-10-24: Vitest 5.0.5 usa Vite 8 (Rolldown + Oxc), que emite los metadatos de decoradores a partir de `emitDecoratorMetadata` del `tsconfig`; no hace falta `unplugin-swc`. La prueba `apps/api/src/common/di/constructor-injection.spec.ts` falla si se desactiva esa opción y pasa con ella.

## Decisión

[backend-research-definition §3.7](../architecture/backend-research-definition.md):

- **`docker compose` en local y un service container de PostgreSQL en CI.** Una sola ruta de código: la dirección de la base viene siempre del entorno.
- **Aislamiento:** `TRUNCATE ... RESTART IDENTITY CASCADE` antes de cada prueba, y los archivos de integración sin ejecutarse en paralelo (`fileParallelism: false` en ese proyecto de Vitest).
- **Organización:** unitarias `*.spec.ts` junto al código; integración `*.int-spec.ts`; extremo a extremo en `test/e2e`; dobles y fábricas en `test/support` y `test/factories`, fuera de `src`. Vitest 5 con tres proyectos (unit, integration, e2e).
- **Cobertura:** 90 % en `domain/` y `application/`, 80 % global. Se documenta en `vitest.config.ts` que los archivos del 90 % también cuentan para el 80 % (G10).
- **Decoradores bajo Vitest:** verificado el 2026-10-24: Vitest 5.0.5 usa Vite 8 (Rolldown + Oxc), que emite los metadatos de decoradores a partir de `emitDecoratorMetadata` del `tsconfig`; no hace falta `unplugin-swc`. La prueba `apps/api/src/common/di/constructor-injection.spec.ts` falla si se desactiva esa opción y pasa con ella. La prueba se conserva como guarda de regresión de la configuración.

## Alternativas consideradas

- **Testcontainers.** Queda como alternativa si algún día se quiere ejecutar todo con un solo comando (`pnpm test` sin pasos previos); no se adopta para evitar que las pruebas controlen el daemon de Docker.
- **Transacción y rollback por prueba.** Descartada: Prisma no lo expone de forma limpia con `$transaction` interactivo (D15).
- **Simular Prisma en pruebas unitarias.** Descartada: lo prohíbe la regla H1–H4 para CRUD plano.
- **Probar contra Neon.** Prohibido.

## Consecuencias

**Positivas**
- Las pruebas de integración verifican restricciones, índices y migraciones reales.
- El mismo código de pruebas en local y en CI.

**Negativas**
- Hay que levantar `docker compose` antes de las pruebas de integración en local.
- Las pruebas de integración son más lentas al no correr en paralelo por archivo.

## Cuándo revisarla

- Si el paso previo de `docker compose` se vuelve una fricción habitual (evaluar Testcontainers).
- Si la suite de integración crece tanto que el aislamiento con `TRUNCATE` sin paralelismo resulta lento.

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§3.1, §3.7, §6 G7 y G10)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§1.2, §1.3, §A, D15)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§8, §12)
- Prisma, pruebas en CI: https://www.prisma.io/blog/testing-series-5-xWogenROXm · integración: https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing (consultadas el 2026-10-24)
- Testcontainers PostgreSQL: https://node.testcontainers.org/modules/postgresql/ (consultada el 2026-10-24)
- Vitest, proyectos: https://vitest.dev/guide/projects · cobertura: https://vitest.dev/config/coverage · NestJS, receta SWC: https://docs.nestjs.com/recipes/swc (consultadas el 2026-10-24)
