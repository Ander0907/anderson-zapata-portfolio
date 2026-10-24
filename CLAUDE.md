# CLAUDE.md: portafolio de Anderson Zapata

Reglas que no se negocian en este repositorio. El detalle está en `docs/process/06-manual-de-desarrollo.md`, que es la fuente de verdad del proceso. Si algo del manual contradice a `docs/architecture/05-arquitectura-tecnica.md` o a un ADR de `docs/adr/`, manda el documento de arquitectura o el ADR.

## Precedencia

En este repositorio, **el manual prevalece sobre el `CLAUDE.md` global del usuario** (decisión de Anderson, 2026-10-24). En concreto:

- Prefijos de rama: `feat/`, `fix/`, `docs/`, `chore/`, `ci/`, `refactor/` (no `feature/`). Se crean desde `development` actualizada y su PR va a `development` («to DEV: …»). Las promociones `development` → `release` (UAT) → `main` (PDN) solo se abren cuando Anderson lo pide o lo aprueba.
- Stack: TypeScript con NestJS 12, Next.js, Prisma 7.10.1, PostgreSQL, Zod 4 y Vitest 5. El análisis estático y el formato son los del monorepo (linter, comprobación de tipos y formateador), no PHPStan ni Pint.
- Nombres de ficheros de `docs/` en inglés kebab-case para los documentos nuevos.

Del `CLAUDE.md` global se mantienen: responder en español, analogías con Python al explicar código de otro lenguaje, rol de orquestador que delega, TDD obligatorio, reglas de rendimiento y seguridad por defecto.

## Reglas

1. **Orquestación:** la sesión principal planifica, delega en los agentes de `.claude/agents/`, verifica (ejecuta las pruebas y lee el diff) e integra. No escribe código de producción. Los agentes no crean otros agentes. Máximo 3 a la vez.
2. **TDD:** ninguna línea de producción sin una prueba que fallara antes por la razón correcta. Commits `test:` → `feat:`/`fix:` → `refactor:`. Prohibido saltar, debilitar o borrar pruebas para pasar. Cobertura mínima: 90 % en `domain/` y `application/`, 80 % global.
3. **Git:** una rama por funcionalidad y un árbol de trabajo por agente (`../wt-<rama>`). Dos agentes nunca editan la misma rama a la vez. PR con la plantilla y fusión **sin squash**. Prohibido `--no-verify`, `push --force` en ramas compartidas y commitear secretos.
4. **Idioma:** código, commits, ramas, identificadores, API y base de datos en inglés; texto visible para el visitante, URL públicas del sitio y documentación en español (manual 7.4).
5. **Arquitectura del backend:** monolito modular; puertos y adaptadores solo cuando la regla H1–H4 (ADR-017) lo justifica; CRUD plano probado con PostgreSQL real en el resto. Decisiones aprobadas en `docs/architecture/backend-research-definition.md`.
6. **Detenerse y preguntar a Anderson** ante gasto, cuentas o credenciales, acciones destructivas o irreversibles, ambigüedad, cambios a decisiones tomadas, o skills y agentes que no pasen el filtro.

## Mapa de documentos

| Documento | Para qué |
|---|---|
| `docs/discovery/01-discovery.md` | Visión, públicos y restricciones |
| `docs/requirements/02-requirements.md` | RF y RNF |
| `docs/content/03-information-architecture.md`, `docs/content/draft-content.md` | Mapa del sitio, inventario y borrador del contenido |
| `docs/design/04-ux-ui.md` | Diseño visual y accesibilidad |
| `docs/architecture/05-arquitectura-tecnica.md` | Decisiones de infraestructura (fase 5) |
| `docs/architecture/backend-research.md`, `docs/architecture/backend-research-definition.md` | Investigación del backend y decisiones aprobadas |
| `docs/adr/` | Decisiones de arquitectura |
| `docs/process/06-manual-de-desarrollo.md` | Proceso de desarrollo |
| `docs/process/agents-and-models.md`, `docs/process/skills.md` | Agentes, modelos y skills |
