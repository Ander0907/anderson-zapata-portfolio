# ADR-020: Flujo de ramas DEV → UAT → PDN

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- La decisión 15 de [05-arquitectura-tecnica](../architecture/05-arquitectura-tecnica.md) y el manual describían ramas cortas con pull request directo a `main` protegida (trunk-based), con dos entornos: local y producción.
- Anderson ya trabaja con una práctica DEV/UAT/PDN, visible en los PR #1–#6 del repositorio, y decidió mantenerla el 2026-10-24.
- El proyecto aplica TDD obligatorio; el historial rojo → verde de cada rama es la evidencia que revisa el auditor TDD.

## Decisión

- **Tres ramas largas:** `development` (DEV, integración), `release` (UAT, aceptación) y `main` (PDN, producción).
- **Ramas de funcionalidad** con prefijos `feat/`, `fix/`, `docs/`, `chore/`, `ci/` y `refactor/`, creadas desde `development`. Su PR va a `development` con el título «to DEV: <mensaje convencional>».
- **Promociones:** `development` → `release` («to UAT: …») y `release` → `main` («to PDN: …»). Se abren **solo cuando Anderson lo pide o lo aprueba**.
- **Fusión con merge commit, nunca squash:** el historial rojo → verde es la evidencia de TDD.
- **Entornos:** siguen siendo solo local y producción (sin staging). `release` es una rama de aceptación, no un entorno. **Solo `main` despliega.**
- Las tres ramas se protegen: PR obligatorio y sin push directo.

## Alternativas consideradas

- **Trunk-based con PR directo a `main`** (lo que decían la decisión 15 y el manual). Descartada por Anderson para mantener su práctica DEV/UAT/PDN.
- **Añadir un entorno de staging real.** Descartada: coste y mantenimiento para una sola persona.

## Consecuencias

**Positivas**
- Coherente con la práctica habitual de Anderson.
- Las promociones agrupan varias funcionalidades y quedan bajo su control explícito.
- El historial TDD se conserva al no aplastar commits.

**Negativas**
- Tres PR desde una funcionalidad hasta producción.
- Las promociones agrupan varias funcionalidades, lo que retrasa su llegada a producción.
- El auditor TDD y los revisores comparan contra `origin/development`, no contra `main`.

## Cuándo revisarla

- Si se añade un entorno de staging o de aceptación real.
- Si el coste de los tres PR por funcionalidad frena la entrega.

## Fuentes

- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§6)
- [docs/architecture/05-arquitectura-tecnica.md](../architecture/05-arquitectura-tecnica.md) (§2, decisión 15, actualizada con referencia a este ADR)
