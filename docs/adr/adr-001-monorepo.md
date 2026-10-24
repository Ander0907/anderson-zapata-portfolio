# ADR-001: Un monorepo en lugar de dos repositorios

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- El portafolio lo construye y mantiene una sola persona, en sesiones de fin de semana, y el repositorio es público desde el primer commit porque los entrevistadores revisan el código y la arquitectura ([01-discovery](../discovery/01-discovery.md)).
- El sistema tiene dos aplicaciones (sitio Next.js y API NestJS) que comparten contratos: los esquemas de validación del formulario y los tipos del contenido publicado que el build lee de la API ([backend-research-definition §2.1](../architecture/backend-research-definition.md)).
- Todo el CI/CD vive en GitHub Actions y «el pipeline completo queda visible en el repositorio» (decisión 5 de [05-arquitectura-tecnica §2](../architecture/05-arquitectura-tecnica.md)).
- El documento de arquitectura lista este ADR como «Un monorepo en lugar de dos repositorios» (§8), pero no desarrolla los motivos. [PENDIENTE: motivos originales de Anderson para elegir monorepo frente a dos repositorios; aquí solo se recogen los hechos documentados que dependen de esta decisión.]

## Decisión

Un único repositorio con **pnpm workspaces** ([manual §12](../process/06-manual-de-desarrollo.md), rama 0):

- `apps/api`: la API NestJS 12.
- `apps/web`: el sitio Next.js (incluye en `apps/web/public` el CV y la foto como archivos estáticos).
- `packages/shared`: esquemas Zod, catálogo de códigos de error y traducciones (`messages/es.ts`), con exports por subruta y **sin archivo barril** (`index.ts`) para evitar conflictos entre ramas.

Todo el monorepo usa ESM y NodeNext (ADR-010).

## Alternativas consideradas

- **Dos repositorios (web y API).** Descartada. [PENDIENTE: motivo de descarte documentado por Anderson.] Hechos que la hacen más costosa en este proyecto: la regla de validación se escribe una sola vez en `packages/shared` y la usan la web y la API (ADR-009); con dos repositorios ese paquete tendría que publicarse o copiarse.

## Consecuencias

**Positivas**
- Un solo lugar para el código, la documentación (ADR, manual) y el pipeline, coherente con un repositorio que sirve de evidencia pública.
- Contratos compartidos (`packages/shared`) sin publicar paquetes.

**Negativas**
- Ficheros compartidos que generan conflictos entre ramas (`pnpm-lock.yaml`, `app.module.ts`, `packages/shared/src/errors/codes.ts`, workflows): el orquestador los integra una rama tras otra ([manual §6 y §12](../process/06-manual-de-desarrollo.md)).
- El CI debe distinguir qué se despliega (imagen de la API a Cloud Run, sitio a Cloudflare) dentro del mismo repositorio.

## Cuándo revisarla

- Si la web y la API pasan a tener ciclos de vida o equipos distintos.
- Si los conflictos en ficheros compartidos frenan el trabajo en paralelo de forma recurrente.

## Fuentes

- [docs/architecture/05-arquitectura-tecnica.md](../architecture/05-arquitectura-tecnica.md) (§2 decisión 5, §8)
- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§2.1, §3.1)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§6, §12)
- [docs/discovery/01-discovery.md](../discovery/01-discovery.md)
