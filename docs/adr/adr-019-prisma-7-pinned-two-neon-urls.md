# ADR-019: Prisma 7 fijo y dos URL de Neon

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- El ORM elegido es **Prisma 7** (decisión 13 de [05 §2](../architecture/05-arquitectura-tecnica.md)): esquema legible, cliente tipado y migraciones SQL versionadas.
- En npm, la etiqueta `latest` de Prisma apunta hoy (2026-10-24) a `8.0.0-rc.27`, una versión de pruebas; la anterior estable es 7.10.1. Un `pnpm add prisma` sin número instalaría la RC de Prisma 8.
- Neon ofrece dos direcciones: la **pooled** (PgBouncer) y la **directa**. El motor de migraciones usa una sola conexión y con la pooled falla con «prepared statement already exists».
- Prisma 7: `url`/`directUrl` salen del schema y pasan a `prisma.config.ts`, que no carga `.env` automáticamente; driver adapter `@prisma/adapter-pg` obligatorio; `migrate dev` no regenera el cliente.

## Decisión

[backend-research-definition §2.2 y §2.3](../architecture/backend-research-definition.md):

- **Versiones exactas** (sin `^`): `prisma`, `@prisma/client` y `@prisma/adapter-pg` en **7.10.1**. Lo mismo para `@nestjs/*` y `zod` (D1). Dependabot o Renovate proponen actualizaciones agrupadas en un solo PR.
- **Dos URL desde el principio:** `DATABASE_URL` (pooled) para la aplicación y `DATABASE_URL_UNPOOLED` (directa) para las migraciones, configurada en `prisma.config.ts`.
- **Migraciones** como paso aparte del pipeline (`migrate deploy`) **antes del despliegue**, nunca al arrancar el contenedor; nunca `migrate dev` ni `db push` contra Neon (D18). Las pruebas jamás tocan Neon.
- `prisma generate` se ejecuta en el pipeline; el cliente generado no se versiona.
- Ambas direcciones van a Secret Manager; en `.env.example` solo valores de ejemplo.
- **Nombre del archivo de configuración:** se usa `prisma.config.ts` y se comprueba al instalar; si no lo reconoce, se prueba `prisma7.config.ts` y se anota (la receta de Nest y la referencia de Prisma discrepan; G4).

## Alternativas consideradas

- **Rangos `^` o `latest`.** Descartada: actualizaciones silenciosas y riesgo de instalar la RC de Prisma 8.
- **Una sola URL (pooled) para todo.** Descartada: las migraciones fallan con PgBouncer.
- **Migrar al arrancar el contenedor.** Descartada: choca con el arranque en frío y con los 10 s de apagado de Cloud Run.
- **Drizzle o TypeORM** (en lugar de Prisma). Descartados en la decisión 13.

## Consecuencias

**Positivas**
- Instalaciones reproducibles y migraciones fiables en Neon.
- Despliegue separado de la migración: un fallo de migración no deja contenedores a medio arrancar.

**Negativas**
- Las actualizaciones son manuales (vía PR agrupado) y hay que revisarlas.
- Dos secretos de conexión que gestionar.
- Incógnitas por verificar: nombre del archivo de configuración y cómo contar consultas con Prisma 7 (D11).

## Cuándo revisarla

- Cuando Prisma 8 sea estable y la receta de Nest lo adopte.
- Si Neon cambia su modelo de conexiones o se cambia de proveedor de PostgreSQL.

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§2.2, §2.3, §3.4, §6 G4)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§0, §1.2, D1, D18)
- [docs/architecture/05-arquitectura-tecnica.md](../architecture/05-arquitectura-tecnica.md) (§2 decisión 13, §6)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§7.5)
- Prisma: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 · https://www.prisma.io/docs/orm/reference/prisma-config-reference · NestJS, receta de Prisma: https://docs.nestjs.com/recipes/prisma (consultadas el 2026-10-24)
- Neon: https://neon.com/docs/guides/prisma · https://neon.com/docs/guides/prisma-migrations (consultadas el 2026-10-24)
