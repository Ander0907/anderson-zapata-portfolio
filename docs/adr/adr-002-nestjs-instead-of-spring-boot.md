# ADR-002: NestJS en lugar de Spring Boot

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- El backend se limita a dos funciones: el formulario de contacto y el panel de administración del contenido ([01-discovery](../discovery/01-discovery.md), «Decisiones cerradas»).
- Uno de los objetivos del proyecto es el **aprendizaje deliberado**: «consolidar React y adoptar NestJS con una arquitectura moderna en un proyecto real y completo».
- El presupuesto se limita a capas gratuitas de hosting (RNF-11), donde el arranque en frío y la memoria pesan.
- El proyecto lo desarrolla una persona sola, con disponibilidad irregular.
- La decisión se cerró en la fase de descubrimiento (documento fechado el 2026-10-22) y se registra aquí con la fecha de este conjunto de ADR.

## Decisión

El backend se construye con **Node.js y NestJS** (versión vigente: NestJS 12, ver ADR-010), en TypeScript, con PostgreSQL como base de datos (ADR-005).

Motivos, según el documento de descubrimiento: «hosting más sencillo (arranque en frío rápido, menor consumo de memoria, más opciones de alojamiento) y […] reducir tiempo y esfuerzo».

## Alternativas consideradas

- **Java + Spring Boot.** Se evaluó y se descartó por los motivos anteriores: arranque en frío más lento, mayor consumo de memoria y menos opciones de alojamiento gratuito, además de más tiempo y esfuerzo para el plazo previsto. Queda como **proyecto futuro**.

## Consecuencias

**Positivas**
- Un solo lenguaje (TypeScript) en la web, la API y `packages/shared`, lo que permite compartir esquemas (ADR-009).
- Encaja con Cloud Run escalando a cero (ADR-006).

**Negativas**
- NestJS 12 es reciente (12.0 publicada el 27 de agosto): parte del ecosistema puede ir rezagado. Antes de añadir una librería se comprueba que declara soporte para Nest 12 ([backend-research-definition §6, G5](../architecture/backend-research-definition.md)).
- El aprendizaje de NestJS forma parte del coste del proyecto.

## Cuándo revisarla

- Si el arranque en frío o el consumo de memoria dejan de ser restricciones (por ejemplo, hosting con instancias siempre activas).
- Cuando se aborde el proyecto futuro con Java + Spring Boot; no implica migrar este.

## Fuentes

- [docs/discovery/01-discovery.md](../discovery/01-discovery.md) («Decisión de stack: por qué NestJS»)
- [docs/requirements/02-requirements.md](../requirements/02-requirements.md) (RNF-11)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§1.1, G5)
- NestJS, guía de migración 11→12: https://docs.nestjs.com/migration-guide (consultada el 2026-10-24)
- Release v12.0.0: https://github.com/nestjs/nest/releases/tag/v12.0.0 (consultada el 2026-10-24)
