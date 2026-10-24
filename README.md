# Portafolio de Anderson Zapata

Portafolio personal de Anderson Zapata. El sitio público es estático; la API (NestJS) sirve el formulario de contacto y el panel de administración.

**Estado:** en construcción (esqueleto del monorepo).

## Estructura del monorepo

| Ruta | Contenido |
|---|---|
| `apps/api` | API en NestJS 12 (`@portfolio/api`): formulario de contacto y panel. |
| `packages/shared` | Código compartido (`@portfolio/shared`): esquemas Zod, códigos de error y mensajes en español. |
| `apps/web` | Sitio público. Todavía no existe; llegará más adelante. |

## Requisitos

- **Node.js 22.** La versión exacta está en [`.nvmrc`](.nvmrc). El campo `engines` de `package.json` exige `>=22.12`.
- **pnpm 10.28.1.** Es la versión fijada en el campo `packageManager` de [`package.json`](package.json).
- **Docker Desktop**, para levantar la base de datos PostgreSQL local definida en [`docker-compose.yml`](docker-compose.yml).

## Puesta en marcha local

1. Copia la plantilla de variables de entorno y ajusta los valores:

   ```bash
   cp .env.example .env
   ```

   En `.env` cambia `POSTGRES_PASSWORD` por una contraseña propia. Si cambias `POSTGRES_PASSWORD` (o `POSTGRES_USER` / `POSTGRES_DB`), actualiza tambi�n `DATABASE_URL` y `DATABASE_URL_UNPOOLED` con los mismos valores. El fichero `.env` no se sube al repositorio.

2. Instala las dependencias:

   ```bash
   pnpm install
   ```

3. Levanta PostgreSQL 17 en segundo plano:

   ```bash
   docker compose up -d
   ```

   El servicio escucha solo en `127.0.0.1` y en el puerto `POSTGRES_HOST_PORT` (5432 por defecto). Si el 5432 está ocupado (por ejemplo, por un PostgreSQL nativo), cambia `POSTGRES_HOST_PORT` en `.env` y usa ese mismo puerto en `DATABASE_URL` y `DATABASE_URL_UNPOOLED`. La CI no se ve afectada: usa un servicio PostgreSQL propio.

4. Comprueba que el entorno funciona ejecutando la calidad completa (ver la tabla siguiente).

La API todavía no se puede arrancar: el punto de entrada (`main.ts`) y los scripts `dev` y `start` llegan en la rama `feat/api-foundation`.

> Si cambias un `tsconfig`, borra `node_modules/.vitest-cache` antes de volver a ejecutar las pruebas: la caché de Vitest no se invalida sola con esos cambios (ver [ADR-010](docs/adr/adr-010-esm-and-nodenext.md)).

### Comandos

Los comandos de la raíz se ejecutan con `pnpm <script>` desde la raíz del repositorio. Los de `apps/api` usan `pnpm --filter @portfolio/api <script>`.

| Comando | Qué hace |
|---|---|
| `pnpm lint` | Ejecuta ESLint en todo el repositorio. |
| `pnpm format` | Da formato a todos los ficheros con Prettier (los modifica). |
| `pnpm format:check` | Comprueba el formato con Prettier sin modificar nada. |
| `pnpm typecheck` | Comprueba los tipos de cada paquete (`tsc --noEmit`). |
| `pnpm test` | Ejecuta las pruebas de cada paquete con Vitest. |
| `pnpm test:cov` | Ejecuta las pruebas con informe de cobertura. |
| `pnpm build` | Compila todos los paquetes en orden topol�gico: primero `packages/shared` y despu�s `apps/api`, cada uno a su `dist/`. |
| `pnpm --filter @portfolio/api test:unit` | Ejecuta solo las pruebas unitarias de la API. |
| `pnpm --filter @portfolio/api test:int` | Ejecuta las pruebas de integración de la API (usan PostgreSQL). |
| `pnpm --filter @portfolio/api test:e2e` | Ejecuta las pruebas e2e de la API. |
| `docker compose down` | Detiene el contenedor de PostgreSQL. Los datos se conservan en el volumen `postgres-data`. |

## Calidad

### Qué comprueba la CI

El flujo [`.github/workflows/ci.yml`](.github/workflows/ci.yml) se ejecuta en cada `push` y `pull_request` hacia `development`, `release` y `main`. En orden:

1. `pnpm install --frozen-lockfile`
2. `pnpm format:check`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm build`
6. `pnpm test:cov`
7. `pnpm audit --prod --audit-level high` (bloqueante) y `pnpm audit --audit-level high` (informativo, no bloquea)

La CI usa Node según `.nvmrc` y un servicio PostgreSQL `17.11-alpine` fijado por digest, la misma imagen que `docker-compose.yml`.

### TDD y cobertura

- Se trabaja con TDD: primero una prueba que falla por la razón correcta, después el código mínimo y, por último, la refactorización. Detalle en [manual §8](docs/process/06-manual-de-desarrollo.md).
- Umbrales de cobertura: **80 %** global y **90 %** en `domain/` y `application/`.

### Mensajes de commit

Los commits siguen Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`, `ci:`). `commitlint` con `@commitlint/config-conventional` comprueba el formato del mensaje.

## Flujo de ramas

El flujo es **DEV → UAT → PDN**: `development` (DEV), `release` (UAT) y `main` (PDN). Las ramas de trabajo (`feat/`, `fix/`, `docs/`, `chore/`, `ci/`, `refactor/`) se crean desde `development` y su pull request va a `development`. Las promociones a `release` y `main` las abre Anderson o se abren con su aprobación. Detalle en [ADR-020](docs/adr/adr-020-branch-flow-dev-uat-pdn.md) y en el [manual §6](docs/process/06-manual-de-desarrollo.md).

## Documentación

| Documento | Para qué |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Reglas del repositorio y mapa de documentos. |
| [`docs/discovery/01-discovery.md`](docs/discovery/01-discovery.md) | Visión, públicos y restricciones. |
| [`docs/requirements/02-requirements.md`](docs/requirements/02-requirements.md) | Requisitos funcionales (RF) y no funcionales (RNF). |
| [`docs/content/03-information-architecture.md`](docs/content/03-information-architecture.md) | Mapa del sitio. |
| [`docs/content/draft-content.md`](docs/content/draft-content.md) | Borrador del contenido. |
| [`docs/design/04-ux-ui.md`](docs/design/04-ux-ui.md) | Diseño visual y accesibilidad. |
| [`docs/architecture/05-arquitectura-tecnica.md`](docs/architecture/05-arquitectura-tecnica.md) | Decisiones de infraestructura. |
| [`docs/architecture/backend-research-definition.md`](docs/architecture/backend-research-definition.md) | Decisiones aprobadas del backend. |
| [`docs/architecture/backend-research.md`](docs/architecture/backend-research.md) | Investigación del backend y reglas D1–D19. |
| [`docs/process/06-manual-de-desarrollo.md`](docs/process/06-manual-de-desarrollo.md) | Manual de desarrollo (fuente de verdad del proceso). |
| [`docs/process/agents-and-models.md`](docs/process/agents-and-models.md) | Agentes y modelos asignados. |
| [`docs/process/skills.md`](docs/process/skills.md) | Skills instaladas y su motivo. |

### Registros de decisiones (ADR)

El índice completo de los 20 ADR está en [`docs/adr/README.md`](docs/adr/README.md). Algunos ADR relacionados con el monorepo:

| ADR | Tema |
|---|---|
| [ADR-001](docs/adr/adr-001-monorepo.md) | Un monorepo en lugar de dos repositorios |
| [ADR-002](docs/adr/adr-002-nestjs-instead-of-spring-boot.md) | NestJS en lugar de Spring Boot |
| [ADR-010](docs/adr/adr-010-esm-and-nodenext.md) | ESM y NodeNext en todo el monorepo |
| [ADR-017](docs/adr/adr-017-rule-h1-h4.md) | Regla H1–H4 (hexagonal ligera o CRUD plano) |
| [ADR-018](docs/adr/adr-018-database-testing-strategy.md) | Estrategia de pruebas con base de datos |
| [ADR-020](docs/adr/adr-020-branch-flow-dev-uat-pdn.md) | Flujo de ramas DEV → UAT → PDN |
