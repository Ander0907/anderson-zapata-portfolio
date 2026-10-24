# Skills del proyecto

**Fecha:** 2026-10-24 · **Herramienta:** `npx skills` 1.7.4 (skill `find-skills`) · **Criterio:** manual, sección 5.

Instalación: en el proyecto (`.claude/skills/`), solo para Claude Code y copiando los ficheros (`--copy`), registrada en `skills-lock.json` con su hash. Se usó `-y` porque el shell no es interactivo: la confirmación del CLI se sustituyó por la lectura completa del `SKILL.md` y la comparación byte a byte entre lo leído y lo instalado (idénticos en los cinco casos).

Datos de instalaciones: `npx skills find` el 2026-10-24. Estrellas: API pública de GitHub el mismo día.

## 1. Instaladas

| Skill | Origen | Versión | Instalaciones | Estrellas | Agentes | Motivo |
|---|---|---|---|---|---|---|
| `vitest` | `antfu/skills` (Anthony Fu, equipo de Vitest) | generada 2026-10-23 (Vitest 5.1 beta) | 43 K | 6 007 | tdd-test-engineer | Referencia de la API de Vitest: configuración, mocks, cobertura, proyectos |
| `test-driven-development` | `obra/superpowers` (Jesse Vincent) | rama principal, 2026-10-23 | 259 K | 304 598 | tdd-test-engineer, nestjs-developer, tdd-auditor | Ciclo rojo → verde → refactor estricto, verificar el fallo correcto, lista de comprobación |
| `postgresql-table-design` | `wshobson/agents` | rama principal, 2026-10-24 | 27,8 K | 41 633 | prisma-db-engineer | Tipos, restricciones e índices en PostgreSQL. **Aviso:** recomienda claves `bigint`; el proyecto eligió `uuid` y el agente lo sabe |
| `multi-stage-dockerfile` | `github/awesome-copilot` (GitHub) | rama principal | 29,7 K | 40 373 | devops-engineer | Imagen multi-etapa, usuario sin privilegios, caché de capas |
| `security-and-hardening` | `addyosmani/agent-skills` (Addy Osmani) | rama principal, 2026-10-13 | 68,8 K | 110 185 | api-security-auditor | Modelo de amenazas, cabeceras, CORS, cookies, límite de peticiones, cadena de suministro. **Aviso:** enlaza a `../../references/security-checklist.md`, que no se instala con la skill (enlace roto, sin impacto) |

Ninguna de estas cinco declara `allowed-tools`, ni comandos `` !`…` ``, ni pide secretos o acceso de red. Ninguna tiene `disable-model-invocation`, así que todas se pueden precargar.

### 1.1 Instaladas con aprobación expresa de Anderson (2026-10-24)

No cumplían algún umbral del manual (sección 5.6); se instalaron tras su aprobación y con la misma verificación byte a byte.

| Skill | Origen | Versión | Instalaciones | Estrellas | Agentes | Motivo y salvedad |
|---|---|---|---|---|---|---|
| `security-review` | `getsentry/skills` (Sentry) | rama principal, 2026-10-23 | 21 K | 1 083 | api-security-auditor | Método de «solo confianza alta», guía de JavaScript y referencias OWASP. **Salvedad:** declara `allowed-tools: Read Grep Glob Bash Task` (preaprueba Bash y `Task` mientras está activa). El agente no tiene la herramienta `Agent` y el anidamiento está desactivado, así que `Task` no tiene efecto |
| `prisma-cli` | `prisma/skills` (Prisma, oficial) | 7.9.1 | 386 K | 76 | prisma-db-engineer | Referencia de la CLI de Prisma 7. Incluye el punto de control de Prisma que exige consentimiento explícito antes de `migrate reset` o `db push --force-reset`. **Salvedad:** repositorio con menos de 100 estrellas, pero es el fabricante |
| `prisma-client-api` | `prisma/skills` (Prisma, oficial) | 7.9.1 | 389 K | 76 | prisma-db-engineer, nestjs-developer | Consultas, relaciones y transacciones del cliente de Prisma 7. La versión del proyecto es 7.10.1 (Prisma 8 sigue en RC) |

## 2. Diferidas

| Skill | Origen | Instalaciones / estrellas | Motivo | Cuándo |
|---|---|---|---|---|
| `cloud-run-basics` | `google/skills` (Google) | 17,6 K / 21 545 | Oficial y útil, pero instruye ejecutar `gcloud` con `--quiet` (incluidos permisos IAM y activar APIs) y añadir una variable de atribución a los comandos. Riesgo de cambios y coste en la nube | Al empezar `ci/deploy-api`, asignada a devops-engineer, cuya regla le prohíbe ejecutar `gcloud` |

## 3. Descartadas

| Skill | Origen | Motivo |
|---|---|---|
| `nestjs-best-practices` | `kadajett/agent-nestjs-skills` (30 K, 291 estrellas, repositorio sin licencia) | Empuja patrones que el proyecto descarta: eventos, microservicios, caché, JWT. Autor no reconocido |
| `nestjs-expert` | `jeffallan/claude-skills` (5,9 K, 12 K estrellas) | Ejemplos con Jest y TypeORM, `process.env` fuera de la configuración, «pruebas para cada método de servicio». Contradice las reglas del proyecto; las convenciones de NestJS se fijan en el agente y en los ADR |
| `tdd` | `mattpocock/skills` (1,1 M) | Buena, pero exige confirmar con el usuario cada «costura» antes de probar y saca el refactor del ciclo; choca con el flujo del manual |
| `prisma-database-setup` | `prisma/skills` | Obsoleta: redirige a `prisma-orm-setup` |
| `github-actions` | `callstackincubator/agent-skills` | Específica de React Native |
| `github-actions-templates` | `wshobson/agents` | Patrones anticuados (Node 18/20, claves de AWS de larga duración, Snyk con token). Contradice Workload Identity Federation |
| `api-security-testing`, `owasp-top-10-testing` | `usestrix/strix` | Orientadas a su herramienta de pentesting |

No se encontró ninguna skill de NestJS que cumpla el filtro y encaje con las decisiones del proyecto.
