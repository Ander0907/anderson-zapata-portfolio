# Registros de decisiones de arquitectura (ADR)

Un ADR es una nota corta que registra una decisión técnica, por qué se tomó y qué alternativas se descartaron. Cambiar una decisión aceptada exige un ADR nuevo que la sustituya y la aprobación de Anderson.

La numeración de los ADR es independiente de la tabla de decisiones de [05-arquitectura-tecnica §2](../architecture/05-arquitectura-tecnica.md). La lista 001–019 sale de [backend-research-definition §6](../architecture/backend-research-definition.md).

## Índice

| ADR | Título | Estado | Fecha |
|---|---|---|---|
| [001](adr-001-monorepo.md) | Un monorepo en lugar de dos repositorios | Aceptado | 2026-10-24 |
| [002](adr-002-nestjs-instead-of-spring-boot.md) | NestJS en lugar de Spring Boot | Aceptado | 2026-10-24 |
| [003](adr-003-public-content-independent-of-backend.md) | Contenido público independiente del backend (publicar y reconstruir) | Aceptado | 2026-10-24 |
| [004](adr-004-light-dark-theme-design-tokens.md) | Tema claro y oscuro con tokens de diseño | Aceptado | 2026-10-24 |
| [005](adr-005-postgresql-instead-of-document-database.md) | PostgreSQL en lugar de una base de documentos | Aceptado | 2026-10-24 |
| [006](adr-006-cloud-run.md) | Cloud Run como hosting de la API | Aceptado | 2026-10-24 |
| [007](adr-007-sign-in-with-github.md) | Entrar con GitHub en lugar de contraseñas propias | Aceptado | 2026-10-24 |
| [008](adr-008-in-memory-ephemeral-protection-state.md) | Estado en memoria solo para protecciones efímeras, con una instancia | Aceptado | 2026-10-24 |
| [009](adr-009-zod-validation-standard-schema.md) | Validación con Zod mediante Standard Schema | Aceptado | 2026-10-24 |
| [010](adr-010-esm-and-nodenext.md) | ESM y NodeNext en todo el monorepo | Aceptado | 2026-10-24 |
| [011](adr-011-single-api-domain-cloudflare-session-cookie.md) | Dominio único de la API a través de Cloudflare y cookie de sesión | Aceptado | 2026-10-24 |
| [012](adr-012-signed-session-expiry-revocation.md) | Sesión firmada, caducidad y revocación | Aceptado | 2026-10-24 |
| [013](adr-013-error-format-rfc-9457.md) | Formato de errores RFC 9457 (400 y 422) | Aceptado | 2026-10-24 |
| [014](adr-014-logging-with-pino.md) | Registro de eventos con pino | Aceptado | 2026-10-24 |
| [015](adr-015-own-github-oauth-adapter.md) | Adaptador propio de OAuth con GitHub | Aceptado | 2026-10-24 |
| [016](adr-016-health-without-database-and-monitoring.md) | `/health` sin base de datos y monitoreo | Aceptado | 2026-10-24 |
| [017](adr-017-rule-h1-h4.md) | Regla H1–H4 (hexagonal ligera o CRUD plano) | Aceptado | 2026-10-24 |
| [018](adr-018-database-testing-strategy.md) | Estrategia de pruebas con base de datos | Aceptado | 2026-10-24 |
| [019](adr-019-prisma-7-pinned-two-neon-urls.md) | Prisma 7 fijo y dos URL de Neon | Aceptado | 2026-10-24 |
| [020](adr-020-branch-flow-dev-uat-pdn.md) | Flujo de ramas DEV → UAT → PDN | Aceptado | 2026-10-24 |

## Convenciones

- Archivo: `docs/adr/adr-NNN-<titulo-en-ingles-kebab-case>.md` (nombre en inglés, contenido en español; ver [manual §7.4](../process/06-manual-de-desarrollo.md)).
- Estados: **Propuesto**, **Aceptado**, **Sustituido por ADR-NNN**.
- Un ADR aceptado no se reescribe: se sustituye por otro y se actualiza su estado.
- Lo que falta por confirmar se marca como `[PENDIENTE: …]`.
- Extensión orientativa: entre 25 y 70 líneas.

## Plantilla

```markdown
# ADR-NNN: <título>

**Estado:** Propuesto · **Fecha:** AAAA-MM-DD · **Decisores:** Anderson Zapata

## Contexto

Qué problema o fuerza obliga a decidir. Hechos, restricciones y requisitos (RF/RNF) implicados.

## Decisión

Qué se decide, en concreto y verificable.

## Alternativas consideradas

- **Alternativa.** Por qué se descartó.

## Consecuencias

**Positivas**
- …

**Negativas**
- …

## Cuándo revisarla

- Señales concretas que obligarían a reabrir la decisión.

## Fuentes

- Documentos del repositorio (enlaces relativos).
- Fuentes externas con URL y fecha de consulta.
```
