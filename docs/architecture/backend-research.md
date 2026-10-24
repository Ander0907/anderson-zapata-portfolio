# Investigación de arquitectura del backend (Fase 0, manual §7.1)

**Fecha de consulta de todas las fuentes:** 2026-10-24 · **Alcance:** solo investigación, sin cambios en el repositorio.
**Documentos leídos:** `docs/process/06-manual-de-desarrollo.md`, `docs/architecture/05-arquitectura-tecnica.md`, `docs/requirements/02-requirements.md`, `docs/design/04-ux-ui.md`, `docs/architecture/img/modelo-relacional-elegido.png`, `git show HEAD:docs/requirements/03-information-architecture.md`.

> Convención: cada afirmación externa lleva su fuente (URL, consultada el 2026-10-24). Lo marcado **[verificar]** no pude confirmarlo en fuente primaria.

---

## 0. Resumen ejecutivo (lo que cambia respecto al manual)

1. **NestJS 12 es la versión vigente** (`@nestjs/core` 12.2.0 en npm, modificado 2026-10-23). Trae paquetes ESM, **Vitest por defecto en proyectos ESM** y **validación nativa con Standard Schema** (Zod/Valibot) en `@Body({ schema })`. Esto cambia la recomendación de §7.5: **Zod 4 en `packages/shared` en lugar de `class-validator`**.
2. **Prisma: el tag `latest` de npm apunta a `8.0.0-rc.27`.** Hay que fijar `prisma@7.10.1` / `@prisma/client@7.10.1` / `@prisma/adapter-pg@7.10.1` exactos. Un `pnpm add prisma` sin versión instalaría una RC de Prisma 8.
3. **Neon necesita dos URL**: la pooled para la app (`DATABASE_URL`) y la directa para migraciones (`DATABASE_URL_UNPOOLED` en `prisma.config.ts`). El manual §7.5 solo nombra la pooled.
4. **Arctic se deprecó en julio de 2026** y `passport-github2` no publica versión desde 2020. Recomiendo un **adaptador propio de unas 80 líneas** (fetch + `state` + PKCE S256, que GitHub soporta desde julio de 2025).
5. **El ejemplo oficial del limitador detrás de proxy (`req.ips[0]`) es suplantable.** Usar `trust proxy` con número de saltos y `req.ip`, y verificarlo en Cloud Run real.
6. **Riesgo nuevo y bloqueante para `admin-auth`:** si la API vive en `*.run.app` y el panel en el dominio `.dev`, la cookie de sesión es de terceros (cross-site). Hace falta una decisión (ADR) sobre el dominio de la API antes de la rama 5.
7. **Logging:** recomiendo `nestjs-pino` en vez de `ConsoleLogger({ json: true })`. El logger integrado no añade el id de correlación (solo con `@nestjs/observe`), no emite `severity` para Cloud Logging y no redacta datos personales.
8. **ADR-8 (estado):** no es un conflicto real, pero hay que redactarlo bien (§8). Además el manual cita «ADR-008» para «API sin estado» y «/health sin BD», mientras que en el documento de arquitectura el ADR 8 es «límite de peticiones en memoria». **Hay que alinear la numeración.**

---

## 1. Hallazgos por tema (con fuentes)

### 1.1 NestJS
- **Versión vigente:** 12.x. npm: `@nestjs/core` latest = 12.2.0, `legacy` = 11.2.8 (`npm view @nestjs/core dist-tags`, 2026-10-24). Release v12.0.0 publicada el «27 Aug» (año no visible en la página; por npm, 2026). https://github.com/nestjs/nest/releases/tag/v12.0.0
- **Guía de migración 11→12** (https://docs.nestjs.com/migration-guide):
  - Node ≥ 20.19 o ≥ 22.12 para ejecutar; la CLI pide Node 22.22.3+, 24.15+ o 26+.
  - Todos los paquetes del núcleo son ESM. CJS sigue funcionando gracias a `require(esm)`, y `nest new` pregunta entre CJS y ESM.
  - **Proyectos ESM → Vitest por defecto**; CJS → Jest. Los proyectos nuevos usan oxlint; las schematics v12 requieren TypeScript 6.
  - **Standard Schema:** opción `schema` en `@Body/@Query/@Param/@RawBody`, más `StandardSchemaValidationPipe` y `StandardSchemaSerializerInterceptor`. `ValidationPipe` (class-validator) sigue soportado.
  - `@nestjs/config`: `validationSchema` acepta Standard Schema (Zod).
  - `errorCode` en `HttpExceptionOptions`, para códigos legibles por máquina (encaja con la extensión `code` de RFC 9457).
  - El adaptador Express drena las peticiones en curso al apagar. Los hooks de ciclo de vida se ejecutan por nivel de jerarquía. Terminus elimina el API legado de `HealthIndicator` (no nos afecta: el `/health` no usa Terminus).
- **Express 5 es el adaptador por defecto desde Nest 11.** Cambia la sintaxis de rutas comodín. https://docs.nestjs.com/v11/migration-guide
- **Validación con Standard Schema** (https://docs.nestjs.com/techniques/validation): el pipe global solo valida parámetros que declaran `schema`, así que es seguro registrarlo globalmente. `z.strictObject()` rechaza claves desconocidas (equivale a `forbidNonWhitelisted`) y `z.object()` las elimina (equivale a `whitelist`). Los errores de validación devuelven 400 por defecto y se personalizan con `exceptionFactory` (recibe `issues` con `message` y `path`).
- **Testing** (https://docs.nestjs.com/fundamentals/testing): `Test.createTestingModule`, `overrideProvider().useValue()`; los guards, pipes y filtros globales registrados con `APP_*` requieren `useExisting` para poder sobrescribirse. Las pruebas unitarias van junto al código (`.spec.ts`); las e2e, en `test/` con sufijo `.e2e-spec.ts`. Los ejemplos ESM importan con extensión `.js`.
- **Ciclo de vida** (https://docs.nestjs.com/fundamentals/lifecycle-events): `app.enableShutdownHooks()` (desactivado por defecto). Orden: `onModuleDestroy` → `beforeApplicationShutdown` → `onApplicationShutdown`. `SIGTERM` no funciona en Windows; en Cloud Run (Linux) sí.

### 1.2 Prisma 7
- **Receta oficial de Nest** (https://docs.nestjs.com/recipes/prisma): `PrismaService extends PrismaClient`, que construye `new PrismaPg({ connectionString })` y llama a `super({ adapter })`, con `$connect`/`$disconnect` en los hooks. El cliente se genera dentro de `src` (`output = "../src/generated/prisma"`). ESM no necesita configuración; en CJS hay que poner `moduleFormat = "cjs"`. `beforeExit` ya no existe. `migrate dev` **no** regenera el cliente: hay que ejecutar `prisma generate`. La propia receta advierte que el tag `latest` de npm puede apuntar a una pre-release de Prisma 8, **y está ocurriendo hoy** (`latest: '8.0.0-rc.27'`, `prev: '7.10.1'`).
- **Discrepancia:** la receta de Nest dice que desde Prisma 7.10 el archivo se llama `prisma7.config.ts`. La referencia oficial de Prisma (https://www.prisma.io/docs/orm/reference/prisma-config-reference) solo documenta `prisma.config.*` y `.config/prisma.*`. **Usar `prisma.config.ts` y comprobarlo al instalar** [verificar].
- **Guía de actualización a v7** (https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7):
  - Provider `prisma-client` (cliente sin Rust) y `output` obligatorio; el cliente ya no se genera en `node_modules`.
  - `url`/`directUrl` salen del schema y pasan a `prisma.config.ts`.
  - **Driver adapter obligatorio** (`@prisma/adapter-pg`). Node ≥ 20.19. Cambia la validación de certificados SSL porque usa node-pg.
- **`prisma.config.ts` no carga `.env` automáticamente:** hace falta `import 'dotenv/config'` o `--env-file`. `migrations.seed` define el comando de seed. (Referencia de config, arriba.)
- **Neon** (https://neon.com/docs/guides/prisma, https://neon.com/docs/guides/prisma-migrations): `DATABASE_URL` pooled para las consultas de la app y `DATABASE_URL_UNPOOLED` directa para la CLI (migrate, db push). En Prisma 7 no se pone `url` en el `datasource` del schema. Motivo: el motor de migraciones usa una sola conexión y PgBouncer provoca «prepared statement already exists».
- **Pruebas de integración:** Prisma recomienda para GitHub Actions un **service container de Postgres** (https://www.prisma.io/blog/testing-series-5-xWogenROXm). La guía de integración con Docker Compose (https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing) es anterior a v7 (usa Jest y postgres:13). Testcontainers (`@testcontainers/postgresql` 12.2.1; https://node.testcontainers.org/modules/postgresql/) ofrece `getConnectionUri()` y `snapshot()/restoreSnapshot()`.
  - **Recomendación:** **docker compose en local + service container en CI**, como dice el manual. Una sola ruta de código (la `DATABASE_URL` viene del entorno), sin dependencia de un daemon Docker controlado desde las pruebas; en Windows ambas opciones exigen Docker Desktop. Testcontainers queda como alternativa si se quiere `pnpm test` sin pasos previos.
  - Aislamiento: `TRUNCATE ... RESTART IDENTITY CASCADE` en `beforeEach` del proyecto de integración, con `fileParallelism: false` para ese proyecto.

### 1.3 Vitest con NestJS
- **Versión vigente:** Vitest 5.0.5 (`npm view vitest dist-tags`). `@vitest/coverage-v8` 5.0.5.
- **Receta SWC de Nest** (https://docs.nestjs.com/recipes/swc): `unplugin-swc` (2.0.0) en `vitest.config.ts` con `module: { type: 'es6' }`, un `vitest.config.e2e.ts` aparte para `**/*.e2e-spec.ts` y `import request from 'supertest'` (no `import * as`). Hace falta SWC porque esbuild no emite `emitDecoratorMetadata`, del que depende la inyección por tipo de Nest. La receta solo menciona `decoratorMetadata`/`legacyDecorator` en la sección de Jest. **Al montar el esqueleto, confirmar con una prueba roja que la DI por tipo funciona bajo Vitest** [verificar]. **Resultado (2026-10-24):** refutado para Vitest 5, que usa Vite 8 con Oxc y sí emite los metadatos; ver ADR-010.
- **Proyectos** (https://vitest.dev/guide/projects): `test.projects` con `name`/`include` por proyecto y `vitest --project integration`. Desde Vitest 5 los proyectos inline heredan las opciones raíz (`extends: true` por defecto); `globalSetup` no se hereda.
- **Cobertura** (https://vitest.dev/config/coverage): `provider: 'v8'` por defecto. Admite umbrales por glob, por ejemplo `thresholds: { lines: 80, functions: 80, branches: 80, statements: 80, 'src/modules/**/{domain,application}/**': { lines: 90, functions: 90, branches: 90, statements: 90 } }`.
  - **Ojo:** los archivos del glob **también cuentan para el umbral global**, a diferencia de Jest. Los globs no heredan `perFile`.
  - `include: ['src']` y excluir `src/generated/**`, `**/*.module.ts`, `main.ts`, `**/*.spec.ts`.
  - La cobertura debe sumar unit + integración + e2e en un único informe. Un CRUD sin casos de uso se cubre con pruebas de integración, no con mocks de Prisma.

### 1.4 OWASP
- **API Security Top 10: la edición vigente es 2023.** No hay edición posterior publicada. https://api-security.owasp.org/ (redirigido desde owasp.org/API-Security)
- **ASVS: la versión estable es 5.0.0** (30-05-2025); 5.0.1 está planificada y el tag `latest` de GitHub es una compilación de desarrollo. https://asvs.owasp.org/ · https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release
- Mapeo a controles concretos de esta API:

| Riesgo (2023) | Superficie aquí | Controles concretos |
|---|---|---|
| API1 BOLA | Admin: `/v1/admin/*/:id`; un solo administrador | Todo `/v1/admin/**` tras `AdminSessionGuard` (guard global con lista de rutas públicas explícita, **deny by default**); ids UUID; `/v1/content/**` solo devuelve filas `published = true` (prueba de integración que lo verifique) |
| API2 Autenticación rota | OAuth GitHub, cookie de sesión | `state` + PKCE S256; comparar `login` **y** `id` numérico de GitHub con la allowlist; cookie `__Host-` `Secure` `HttpOnly` `SameSite`; expiración absoluta firmada en el payload; rotar `SESSION_SECRET` = revocación global; límite estricto en `/v1/auth/*` |
| API3 Propiedad de objeto | Asignación masiva y exposición de campos | `z.strictObject` en la entrada (rechaza `published`, `id`, `createdAt` donde no se permiten); DTO de salida con mapper explícito; nunca devolver el modelo de Prisma ni el `email` de contacto en endpoints públicos |
| API4 Consumo de recursos | Formulario y build | Throttler (global laxo + estricto en contacto y auth); límite de cuerpo (p. ej. 16 kB); `max()` en todos los strings; paginación con `limit ≤ 50` en la bandeja; timeouts en llamadas salientes; `max-instances=1` y alerta de presupuesto |
| API5 Autorización de función | Rutas admin frente a públicas | Prefijo de ruta separado (`/v1/admin`); prueba e2e que recorre la tabla de rutas y exige 401 sin sesión en todo `/admin` |
| API6 Flujos sensibles de negocio | Spam de contacto, publicar en bucle | Campo trampa + Turnstile + throttler; **antirrebote en «Publicar»** (no disparar dos builds en N segundos) para proteger los 500 builds al mes |
| API7 SSRF | Sin URL controlada por el usuario que el servidor llame | Las llamadas salientes van a hosts fijos (GitHub, Resend, Turnstile) y vienen de config; `repo_url`/`linkedin_url` se validan como URL `https` (LinkedIn: host `linkedin.com`/`www.linkedin.com`) pero **nunca se descargan** desde el servidor |
| API8 Mala configuración | Cabeceras, CORS, errores | `helmet`; CORS con allowlist exacta de orígenes y `credentials: true` solo para el origen del panel; filtro RFC 9457 sin trazas; `x-powered-by` desactivado; Swagger UI fuera de producción |
| API9 Inventario | Versiones y docs | Prefijo `/v1`; `openapi.json` generado en CI y commiteado (diff = cambio de contrato visible en el PR); sin endpoints de depuración |
| API10 Consumo inseguro de APIs | Respuestas de GitHub, Turnstile y Resend | Validar con Zod las respuestas externas que se usan (p. ej. `GET /user` de GitHub); timeouts; reintentos acotados con backoff; tratar `success:false` de Turnstile como rechazo |

- **ASVS 5.0:** recomiendo **nivel 1 como base y L2 en autenticación, sesión y OAuth**. Capítulos aplicables: validación y lógica de negocio, API/servicios web, autenticación, sesión, autorización, OAuth, configuración, protección de datos, logging/errores. Numeración exacta de los capítulos [verificar] en https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release.
- **Sesión** (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): `Secure`, `HttpOnly`, `SameSite=Strict` (preferido) o `Lax`, prefijo `__Host-` (obliga a `Path=/` y a no poner `Domain`). Timeout por inactividad de 15–30 min en apps de bajo riesgo y absoluto de 4–8 h. Regenerar el id al iniciar sesión. «Borrar la cookie no invalida una copia robada»: hay que invalidar en servidor. La hoja **no cubre las sesiones sin estado**, así que hay que decidir una estrategia de revocación (ver §G).
- **CSRF** (https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): `Sec-Fetch-Site` es la «señal primaria», pero exige un fallback obligatorio de Origin/Referer. Doble envío **firmado** (HMAC ligado a la sesión) para apps sin estado; la variante ingenua está desaconsejada. Cabecera personalizada para APIs fetch, con CORS estricto. SameSite solo como defensa en profundidad. Ningún GET debe cambiar estado.

### 1.5 RFC 9457
https://www.rfc-editor.org/rfc/rfc9457.html
- Media type `application/problem+json`. Los cinco miembros (`type`, `status`, `title`, `detail`, `instance`) son **opcionales**. `type` vale `about:blank` por defecto, y entonces `title` debe ser la frase HTTP estándar. `status` debe coincidir con el código de la respuesta. `title` no cambia entre ocurrencias.
- Extensiones permitidas: el cliente ignora las que no conoce. Nombres con letra inicial, alfanuméricos y `_`, de ≥ 3 caracteres. `code` es válido.
- Seguridad: no exponer trazas ni detalles internos. Ante varios problemas, informar del más relevante; el ejemplo de validación usa 422 con `errors: [{ detail, pointer }]`.
- **Implementación propuesta:**
  - `ProblemDetailsFilter` global (`APP_FILTER`, `@Catch()` sin argumentos) que traduce:
    - `DomainError` (clase base propia con `code`, `status` y `title`).
    - `HttpException` de Nest (usa el `errorCode` de v12 si existe; si no, un código derivado como `NOT_FOUND`).
    - `ThrottlerException` → 429 `RATE_LIMITED`.
    - Errores de validación del `StandardSchemaValidationPipe`, mediante un `exceptionFactory` que lanza `ValidationFailedError` con `errors[]`.
    - Errores conocidos de Prisma (`P2002` → 409 `CONFLICT_UNIQUE`, `P2025` → 404).
    - Cualquier otro error → 500 `INTERNAL_ERROR`, `detail` genérico y log con la traza (nunca en la respuesta).
  - Cuerpo: `{ type, title, status, detail?, instance: <path>, code, traceId, errors?: [{ pointer: '/email', code: 'EMAIL_INVALID' }] }`.
  - `type`: `about:blank` para errores HTTP genéricos y `https://<dominio>/problemas/<code-kebab>` solo si algún día se documentan; con `code` estable basta.
  - `errors[].code` usa el catálogo de `packages/shared`, de modo que la web traduce sin parsear texto (encaja con §7.4 del manual).
  - **Decisión para ADR:** 400 (por defecto en Nest) o 422 (ejemplo de la RFC) para la validación. Sugiero **400 para JSON mal formado y 422 para validación semántica**.

### 1.6 Validación compartida: class-validator frente a esquema
- **Problema real:** §7.4 y §7.5 del manual se contradicen en la práctica. `packages/shared` debe contener reglas que use el formulario de Next.js (en el navegador) con mensajes en español, pero `class-validator` depende de decoradores, `reflect-metadata` y clases, que son pesados para el bundle del sitio (RNF-01, Lighthouse > 90) y poco naturales en React.
- **Opciones evaluadas:**

| Opción | Front (Next.js) | Back (Nest 12) | OpenAPI | Veredicto |
|---|---|---|---|---|
| class-validator + clases en shared | Pesado, con decoradores en el navegador | Nativo (`ValidationPipe`), plugin CLI de Swagger | Automático vía plugin | Descartada: el coste en el front y la duplicación |
| **Zod 4 + Standard Schema nativo de Nest 12** | Ligero; `zod/mini` es tree-shakable (≈4 kB frente a 13 kB en un objeto de 3 campos, https://zod.dev/packages/mini) | `@Body({ schema })` + `StandardSchemaValidationPipe`, sin librerías de terceros | `@nestjs/swagger` 12 con la opción `standardSchemaConverter` + `zod-openapi` 6 | **Recomendada** |
| Valibot 1.x | El bundle más pequeño | Igual, vía Standard Schema | `@valibot/to-json-schema` en el converter | Alternativa válida si el bundle aprieta |
| nestjs-zod 5.5 | — | Pipe propio | Parchea internals de Swagger (su propio README avisa que se rompe con parches) | Descartada: Nest 12 lo vuelve innecesario |

- Fuentes: https://docs.nestjs.com/techniques/validation · release de `@nestjs/swagger` 12.0.0 (espejo: https://newreleases.io/project/github/nestjs/swagger/release/12.0.0; **la página oficial de OpenAPI + Standard Schema no la encontré**, [verificar] en docs.nestjs.com/openapi).
- **Recomendación: Zod 4.**
  - Los esquemas viven en `packages/shared` y **producen códigos, no texto**: `z.email({ error: 'EMAIL_INVALID' })`. `packages/shared/src/messages/es.ts` mapea código → frase en español. La web muestra la frase y la API devuelve el `code`.
  - Así se cumple §7.4 al pie de la letra: la API no devuelve texto al visitante, y la excepción «mensajes ya en español» deja de hacer falta.
  - `z.strictObject` en todas las entradas, para que se comporten como `forbidNonWhitelisted`.
  - Hay que **cambiar §7.5 del manual** («class-validator con whitelist + forbidNonWhitelisted»). No es una decisión del documento de arquitectura, pero sí merece un ADR («Validación con Standard Schema/Zod compartida»).
- **Advertencia de Swagger:** con Standard Schema, el DTO para Swagger sale del converter. Si el converter devuelve `undefined`, Swagger cae al DTO derivado de la clase (vacío). La rama `api-foundation` debe incluir una prueba que verifique que el `openapi.json` contiene el esquema del body de contacto.

### 1.7 Transversales
- **Config:** `ConfigModule.forRoot({ validationSchema: envSchema })` con Zod. Las variables sin default son obligatorias y fallan al arrancar, con todos los errores juntos (https://docs.nestjs.com/techniques/configuration). Hay que usar `z.coerce.number()` para `PORT`. Exponer un `AppConfig` tipado y prohibir `process.env` fuera de `config/` con `no-restricted-properties`/`no-restricted-globals` en oxlint/ESLint.
- **Logging:**
  - `ConsoleLogger({ json: true })` emite `level`, `pid`, `timestamp`, `message` y `params`, y **no** añade contexto de petición: la correlación es función de `@nestjs/observe` (https://docs.nestjs.com/techniques/logger). La propia página recomienda Pino/Winston si se necesita **redacción de campos** o serializadores.
  - Cloud Run necesita `severity` y `logging.googleapis.com/trace` = `projects/<P>/traces/<TRACE_ID>` (sacado de `X-Cloud-Trace-Context`) para correlacionar con el log de la petición (https://docs.cloud.google.com/run/docs/logging).
  - **Recomendación: `nestjs-pino` 5.3.1** (peer `@nestjs/* ^11 || ^12`) con:
    - `formatters.level` → `severity` en mayúsculas.
    - `genReqId` que reutiliza el `X-Cloud-Trace-Context` o un `X-Request-Id` y, si no hay, `randomUUID()`.
    - Campo de trace en `customProps`.
    - `redact` para `req.headers.cookie`, `req.headers.authorization`, `*.email`, `*.message`, `*.name` del body de contacto. Mejor aún: no loguear bodies.
  - Alternativa más simple: ConsoleLogger JSON + un interceptor propio con AsyncLocalStorage. Se descarta porque reimplementa lo que pino ya trae.
- **Limitador detrás del proxy:**
  - Nest: `app.set('trust proxy', ...)` y un `ThrottlerGuard` personalizado con `getTracker` (https://docs.nestjs.com/security/rate-limiting). **Su ejemplo usa `req.ips[0]`, la entrada más a la izquierda de `X-Forwarded-For`, que el cliente puede falsificar.**
  - Express: con un número `n` en `trust proxy`, `req.ip` se toma contando saltos **de derecha a izquierda**; con `true` se usa la entrada más a la izquierda (https://expressjs.com/en/guide/behind-proxies.html). En los balanceadores de Google, las entradas anteriores a `<client-ip>,<lb-ip>` no están verificadas (https://docs.cloud.google.com/load-balancing/docs/https).
  - La documentación del contrato de Cloud Run **no especifica el formato de `X-Forwarded-For`** (https://docs.cloud.google.com/run/docs/container-contract).
  - **Recomendación:** `trust proxy = 1` (ajustar si hay un LB delante), `getTracker = req.ip` (no `req.ips[0]`), y en la rama de despliegue una **prueba manual documentada** con `curl -H 'X-Forwarded-For: 1.2.3.4'`, comprobando que el tracker ignora el valor inyectado.
  - El storage en memoria es el por defecto; en multiinstancia la doc remite a Redis.
- **helmet** 8.3.0 con la configuración por defecto (la API no sirve HTML, salvo Swagger fuera de prod). **CORS:** `origin: [ADMIN_ORIGIN, SITE_ORIGIN]` exactos desde config; `credentials: true`; métodos limitados.
- **CSRF del panel** (con la cookie de sesión):
  1. `SameSite=Strict` (o `Lax` si el retorno del OAuth lo exige: la redirección desde github.com es una navegación cross-site, y con `Strict` la cookie **no** se envía en ese primer GET; se resuelve porque la cookie de sesión se emite **en** el callback y la de `state`/PKCE puede ser `Lax`).
  2. **Guard de origen** en todo método no seguro bajo `/v1/admin`: `Sec-Fetch-Site ∈ {same-origin, same-site}` o `Origin` exacto en la allowlist; si falta todo, rechazar.
  3. Cabecera personalizada obligatoria (`X-Requested-With: fetch` o similar), que fuerza el preflight CORS.

  Es suficiente para un panel de un solo usuario sin formularios HTML clásicos; el doble envío firmado se deja como alternativa si la decisión de dominio obliga a `SameSite=None`.
- **OAuth GitHub:**
  - GitHub soporta PKCE (solo S256) en OAuth Apps desde el 14-07-2025 (https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/; https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
  - **Arctic está deprecado desde julio de 2026** (https://arctic.pilcrowonpaper.com/; npm 3.7.0) y `passport-github2` 0.1.12 lleva sin cambios desde 2020 (npm).
  - **Recomendación:** puerto `GithubOAuthClient` con `buildAuthorizeUrl(state, codeChallenge)`, `exchangeCode(code, verifier)` y `fetchUser(token)`, más un adaptador con `fetch` nativo. Pedir el scope mínimo (ninguno, o `read:user`). Descartar el token de GitHub tras leer el usuario: no se guarda. Así se evitan Passport y `@nestjs/passport`, sus estrategias y su sesión.
- **Cookie de sesión firmada:** payload `{ sub: githubId, login, iat, exp }`, firmado con HMAC-SHA256 (`node:crypto`). `SESSION_SECRET` ≥ 32 bytes, en Secret Manager. No hace falta JWT ni una librería: es un puerto `SessionCodec` de unas 40 líneas, probado con un reloj inyectado.
- **Apagado y arranque en Cloud Run:** Cloud Run envía SIGTERM y da **10 s** antes de SIGKILL. La app debe escuchar en `PORT` (8080 por defecto) y `0.0.0.0` (https://docs.cloud.google.com/run/docs/container-contract). `app.enableShutdownHooks()` + `PrismaService.onModuleDestroy → $disconnect`; Nest 12 drena las peticiones en curso. En el Dockerfile, ejecutar `node` directamente (no `pnpm start`) para que reciba la señal.
- **Turnstile** (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/): `POST .../siteverify` con `secret`, `response`, `remoteip` opcional e `idempotency_key` opcional (UUID, para reintentar con seguridad). El token caduca a los 300 s y es de un solo uso (`timeout-or-duplicate`). Poner timeout (los ejemplos usan 10 s; aquí sugiero 3–5 s). Existen claves de prueba.
- **`repository_dispatch`** (https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event): `event_type` ≤ 100 caracteres, `client_payload` ≤ 10 propiedades y < 64 KB, respuesta 204. El PAT clásico necesita `repo`; la doc no detalla permisos para tokens fine-grained [verificar]: probablemente `Contents: write`, limitado a este repositorio.

---

## A. Estructura de carpetas propuesta

**Decisión previa: ESM en todo el monorepo.** Nest 12 lo trae por defecto, con Vitest por defecto; Prisma 7 lo trata como camino principal, y Next.js también. Implica `"type": "module"`, `module`/`moduleResolution: "NodeNext"` e imports relativos con `.js`.

```
apps/api/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/                    # SQL versionado (commiteado)
│  └─ seed.ts
├─ prisma.config.ts                  # url = DATABASE_URL_UNPOOLED (CLI); import 'dotenv/config'
├─ src/
│  ├─ main.ts                        # bootstrap: logger, trust proxy, helmet, cors, body limit, shutdown hooks, listen(PORT,'0.0.0.0')
│  ├─ app.module.ts
│  ├─ config/                        # único lugar que lee process.env
│  │  ├─ env.schema.ts               # Zod
│  │  └─ app-config.ts               # tipos + provider
│  ├─ common/                        # transversal (sin lógica de negocio)
│  │  ├─ errors/  domain-error.ts, problem-details.filter.ts (+ .spec.ts)
│  │  ├─ http/    origin.guard.ts, admin-session.guard.ts, client-ip-throttler.guard.ts
│  │  ├─ logging/ logger.module.ts
│  │  └─ time/    clock.port.ts, system-clock.ts      # solo si un caso de uso lo necesita
│  ├─ infrastructure/
│  │  └─ prisma/  prisma.service.ts, prisma.module.ts
│  ├─ generated/prisma/              # cliente generado (gitignored, `prisma generate` en CI)
│  └─ modules/
│     ├─ health/      health.controller.ts (+ .spec.ts)
│     ├─ content/     # lectura pública (CRUD-plano)
│     │  ├─ content.controller.ts
│     │  ├─ content.service.ts       # consultas Prisma con select/include explícitos
│     │  ├─ content.mapper.ts        # Prisma → DTO de salida
│     │  └─ content.service.int-spec.ts
│     ├─ contact/     # hexagonal ligera
│     │  ├─ domain/        contact-message.ts, contact.errors.ts
│     │  ├─ application/   submit-contact-message.use-case.ts (+ .spec.ts)
│     │  │                 ports/ contact-message.repository.ts, captcha-verifier.ts, contact-notifier.ts
│     │  ├─ infrastructure/prisma-contact-message.repository.ts (+ .int-spec.ts)
│     │  │                 turnstile-captcha-verifier.ts (+ .spec.ts con fetch simulado)
│     │  │                 resend-contact-notifier.ts (+ .spec.ts)
│     │  ├─ http/          contact.controller.ts, contact-inbox.controller.ts
│     │  ├─ inbox.service.ts            # RF-14, CRUD-plano
│     │  └─ contact.module.ts
│     ├─ auth/        # hexagonal ligera
│     │  ├─ application/   complete-github-login.use-case.ts (+ .spec.ts), ports/github-oauth-client.ts, ports/session-codec.ts
│     │  ├─ infrastructure/github-oauth.client.ts, hmac-session.codec.ts (+ .spec.ts)
│     │  ├─ http/auth.controller.ts
│     │  └─ auth.module.ts
│     ├─ admin-content/  # CRUD-plano, un submódulo por recurso
│     │  ├─ technologies/  projects/  experience/  skills/  references/  profile/
│     │  │   └─ <res>.controller.ts, <res>.service.ts, <res>.mapper.ts, <res>.service.int-spec.ts
│     │  └─ admin-content.module.ts
│     └─ publish/     # hexagonal ligera
│        ├─ application/ publish-site.use-case.ts (+ .spec.ts), ports/site-deployment-trigger.ts
│        ├─ infrastructure/github-dispatch.trigger.ts
│        └─ http/publish.controller.ts
├─ test/
│  ├─ e2e/            *.e2e-spec.ts   (supertest sobre la app completa con BD real)
│  ├─ support/        db.ts (truncate), app.ts (crear app de prueba), fakes/ (in-memory repos, fake clock, fake notifier)
│  └─ factories/      build-project.ts, build-contact-message.ts …  (funciones, sin librería)
├─ vitest.config.ts   # projects: unit (*.spec.ts), integration (*.int-spec.ts, sin paralelismo de ficheros), e2e
└─ Dockerfile

packages/shared/
├─ src/
│  ├─ schemas/        contact-message.ts, project.ts, experience.ts, skill.ts, reference.ts, profile.ts, technology.ts
│  │                  # un fichero por recurso: entradas (create/update) y salidas públicas
│  ├─ errors/codes.ts # catálogo de códigos estables (const + tipo unión)
│  ├─ messages/es.ts  # código → texto en español (solo lo consume la web)
│  └─ content/        published-content.ts   # tipos inferidos de los esquemas de salida (contrato build ↔ API)
├─ package.json       # "exports": { "./schemas/*": ..., "./errors": ..., "./messages/es": ... } — sin barrel index
└─ vitest.config.ts   # pruebas de los esquemas (.spec.ts junto a cada uno)
```

**Dónde viven las pruebas:**
- Unitarias: `*.spec.ts` junto al código.
- Integración con BD: `*.int-spec.ts` junto al adaptador o servicio.
- E2E HTTP: `test/e2e`.
- Dobles y factorías: en `test/support` y `test/factories`, **fuera de `src`** para no contarlos en la cobertura ni empaquetarlos.

**Por qué sin barrel:** `index.ts` sería un archivo que todas las ramas editan (conflictos, manual §6).

---

## B. Patrones

**Adoptados (cada uno con problema, dónde se usa y alternativa):**

| Patrón | Problema que resuelve aquí | Dónde | Alternativa descartada |
|---|---|---|---|
| Monolito modular por funcionalidad | Un solo desarrollador; despliegue único en Cloud Run | `src/modules/*` | Capas globales (`controllers/`, `services/`): mezclan dominios y dispersan cada cambio |
| Puertos y adaptadores (**solo donde la regla C lo active**) | Probar sin red (Resend, Turnstile, GitHub) y cambiar de proveedor (plan B del doc de arquitectura) | contact, auth, publish | Mockear `fetch` o el SDK en cada prueba: frágil y acoplado |
| Caso de uso (una clase, un método `execute`) | Orquestar varios efectos con orden y semántica de fallo (persistir → notificar) | `SubmitContactMessage`, `CompleteGithubLogin`, `PublishSite` | Lógica en el controlador: no se prueba sin HTTP |
| Repository (interfaz específica, no genérica) | Doble en memoria para pruebas unitarias rápidas del caso de uso | `ContactMessageRepository` | Usar Prisma directamente en el caso de uso (correcto en CRUD, no aquí) |
| Adapter | Envolver SDK y HTTP externos tras el puerto | Resend, Turnstile, GitHub OAuth, dispatch | — |
| Strategy por configuración (factory provider de Nest) | Desarrollo local sin claves reales: `ConsoleNotifier` y `AlwaysPassCaptcha` solo si `NODE_ENV !== 'production'` (la config valida que en producción existan las claves) | providers de contact y publish | `if (env)` repartidos por el código |
| Mapper (funciones puras) | No filtrar el modelo de Prisma; forma estable del contrato | `*.mapper.ts` | AutoMapper o `class-transformer` con grupos: magia y dependencia extra |
| Guard / Filter / Interceptor de Nest | Lo transversal: sesión, origen, throttler, errores | `common/` | Middleware ad hoc por ruta |
| Errores de dominio tipados + filtro | Formato único RFC 9457 con `code` estable | `DomainError` → `ProblemDetailsFilter` | Result/Either en todo el código: más ceremonia sin beneficio aquí |
| Factory de datos de prueba (funciones `buildX(overrides)`) | Pruebas legibles sin fixtures gigantes | `test/factories` | fishery u otra librería: innecesaria |
| Inyección de reloj e id (`Clock`, `IdGenerator`) | Determinismo en pruebas (manual §8.8) | Solo donde haya expiración (sesión) o fecha visible | Usar el reloj del sistema y `vi.useFakeTimers` en todas partes |

**Descartados por sobreingeniería (proyecto de una persona):**
- **CQRS (`@nestjs/cqrs`) y buses de comandos o eventos:** un solo modelo de lectura sencillo; el sitio estático ya es la «proyección de lectura».
- **Event sourcing:** sin requisito de auditoría ni de reconstrucción histórica.
- **DDD completo** (agregados, value objects por campo, eventos de dominio): poca lógica de negocio; se usan funciones puras de dominio solo en contact.
- **Repositorio genérico `BaseRepository<T>` / Unit of Work propio:** Prisma ya es ambas cosas (`$transaction`). Un genérico obliga a filtrar el ORM o a un mínimo común inútil.
- **Interfaces para todo servicio** (`IProjectService`): solo se abstrae lo que cambia o se simula.
- **Microservicios, colas o outbox transaccional:** el mensaje se persiste antes de notificar; la bandeja (RF-14) es la fuente de verdad, así que un correo perdido no pierde datos. El outbox queda como evolución si el volumen lo exigiera.
- **Redis o caché:** contra RNF-11 y ADR-8; no hace falta con una sola instancia y el sitio estático.
- **GraphQL, BFF o API gateway:** un único consumidor de lectura (el build) y un panel.
- **Proveedores con scope de petición:** penalizan el rendimiento; el contexto de la petición lo lleva pino o AsyncLocalStorage.
- **Passport y JWT:** un solo administrador, una cookie HMAC y un adaptador OAuth propio son menos código y menos superficie.
- **Hexagonal en módulos CRUD:** lo prohíbe la regla C.

---

## C. Regla de decisión: ¿hexagonal ligera o CRUD plano?

**Checklist (el revisor la aplica a cada operación del módulo; basta un «sí»):**

| # | Pregunta | Si «sí», qué se crea (y nada más) |
|---|---|---|
| H1 | ¿La operación llama a un **sistema externo distinto de la propia PostgreSQL** (HTTP o SDK de terceros)? | Un **puerto para ese sistema** y su adaptador. Fake en `test/support/fakes` |
| H2 | ¿Coordina **≥ 2 efectos** con un orden o una semántica de fallo que importen (p. ej. «persistir y luego notificar; si el correo falla, responder 201 igual»)? | Un **caso de uso** + puerto de repositorio (para probar el orden con dobles en memoria) |
| H3 | ¿Tiene una **regla de negocio** que no es validación de forma (transiciones de estado restringidas, antirrebote temporal, allowlist, expiración)? | Una **función o clase de dominio pura** con pruebas unitarias. Solo pasa a caso de uso si además cumple H1 o H2 |
| H4 | ¿Su resultado depende del **reloj o del azar** de forma observable? | Inyectar `Clock`/`IdGenerator` |

**Si todo es «no» → CRUD plano:**
- `controller → service → PrismaService`, con mapper de salida.
- Validación con un esquema de `packages/shared`.
- Pruebas: integración con PostgreSQL real (servicio) + e2e de las rutas. **No se mockea Prisma.**
- Una escritura anidada en transacción (`project` + `project_decision` + `project_technology`) **no** activa H2: es una sola operación de la base de datos.

**Reglas de aplicación:**
- Se evalúa **por operación**, no por módulo: un módulo puede tener una operación hexagonal y el resto CRUD (por ejemplo, contact).
- Se crea **solo** lo que activó la regla: H1 sola → puerto del externo, sin puerto de repositorio.
- El umbral del 90 % de cobertura aplica a `domain/` y `application/`. Si una carpeta así existe sin que la justifique una regla H, el revisor la rechaza («capa por si acaso»).
- Cumplimiento mecánico: `no-restricted-imports` en `**/domain/**` y `**/application/**` prohíbe importar `@prisma/*`, `src/generated/**`, `@nestjs/*` (salvo `@nestjs/common` para `@Injectable`/`@Inject`, si se decide), `resend` y `express`.

**Aplicación a cada módulo:**

| Módulo / operación | H1 | H2 | H3 | H4 | Resultado |
|---|---|---|---|---|---|
| health `GET /health` | no | no | no | no | Controlador sin servicio; sin BD |
| content-read (público, `GET /v1/content/...`) | no | no | no (el filtro `published` es una consulta) | no | **CRUD plano** (solo lectura) + prueba que limita el número de consultas (evitar N+1 con `include`/`select`) |
| contact `POST /v1/contact-messages` | sí (Turnstile, Resend) | sí (persistir → notificar) | sí (campo trampa → descartar en silencio con 202/201 falso) | sí (`createdAt`) | **Hexagonal ligera**: `SubmitContactMessage` + puertos `ContactMessageRepository`, `CaptchaVerifier`, `ContactNotifier`, `Clock` |
| contact inbox RF-14 (listar, marcar, archivar) | no | no | **depende**: si las transiciones son libres, no; si hay reglas (p. ej. archivado no vuelve a «nuevo»), sí → función pura `nextStatus()` | no | **CRUD plano** paginado (+ función pura si se confirman reglas) |
| admin-auth (login, callback, logout, `me`) | sí (GitHub) | sí (canjear código → leer usuario → comprobar allowlist → emitir sesión) | sí (allowlist, expiración) | sí | **Hexagonal ligera**: `CompleteGithubLogin` + `GithubOAuthClient`, `SessionCodec`, `Clock` |
| admin-content: projects, experience, skills, technologies, references, profile | no | no | no (reglas de forma como «URL de LinkedIn» o «repo_url obligatorio si es público» van en el esquema Zod) | no (`updatedAt` lo pone la BD) | **CRUD plano** por recurso; reordenar = transacción en el servicio |
| publish `POST /v1/admin/publish` | sí (GitHub dispatch) | no | sí (antirrebote: no más de un dispatch cada N min) | sí | **Hexagonal ligera mínima**: `PublishSite` + `SiteDeploymentTrigger` + `Clock` (el último dispatch puede guardarse en memoria, como el throttler, o en BD; ver F) |

---

## D. Reglas adicionales recomendadas (además de §7.5)

| # | Regla | Motivo | Alternativa |
|---|---|---|---|
| D1 | **Versiones exactas** (sin `^`) para prisma, `@prisma/*`, `@nestjs/*`, zod; Renovate o Dependabot con PR agrupados | `latest` de Prisma es hoy una RC de la v8; Nest 12 es reciente | Rangos `^`: actualizaciones silenciosas |
| D2 | **ESM + NodeNext** en todo el monorepo; Node 22 LTS (≥ 22.12) en local, CI y Docker | Requisito de Nest 12, Prisma 7 y la CLI | CJS con `moduleFormat="cjs"`: funciona, pero rema contra los defaults |
| D3 | **Esquemas en `packages/shared` emiten códigos, no texto**; `messages/es.ts` traduce | Cumple §7.4 sin excepción y deja una sola fuente | Mensajes en español dentro de los esquemas (lo que dice el manual hoy) |
| D4 | **Entradas con `z.strictObject`** y `max()` en todo string y array | API3/API4 | `z.object` (descarta en silencio, oculta errores del cliente) |
| D5 | **Límite de tamaño del body** (p. ej. `express.json({ limit: '16kb' })`) | API4 | Default de Express (100 kB) |
| D6 | **Timeouts (`AbortSignal.timeout`) y reintentos acotados con backoff** en todo adaptador saliente; `idempotency_key` en Turnstile | API10; arranques en frío | Sin timeout: la petición cuelga hasta que Cloud Run la corta |
| D7 | **Ningún GET cambia estado**; guard de origen y cabecera personalizada en todos los métodos no seguros de `/v1/admin` | CSRF (OWASP) | Tokens de doble envío firmados (más código) |
| D8 | **Guard de sesión global con «deny by default»** y decorador `@Public()` explícito | API1/API5; olvidar el guard es el fallo típico | Guard por controlador |
| D9 | **Prueba de inventario de rutas**: e2e que recorre las rutas registradas y exige 401 sin sesión en `/v1/admin/**` | API5/API9 | Revisión manual |
| D10 | **`openapi.json` generado y commiteado**; CI falla si no coincide | El contrato cambia de forma visible en el PR; alimenta la página `/arquitectura` | Solo Swagger UI en tiempo de ejecución |
| D11 | **Prueba de número de consultas** en content-read (contar eventos `query` de Prisma o de `pg`) | Regla de performance del usuario (N+1) | Confiar en la revisión [verificar API de eventos de log con driver adapters en Prisma 7] |
| D12 | **Paginación obligatoria** en listados admin (bandeja), `limit ≤ 50`; índice en `(status, created_at DESC)` | Regla de performance del usuario | Listado completo |
| D13 | **Logs: no registrar bodies**; `redact` de cookie, authorization y campos personales; incluir `severity` y trace de GCP | Manual §7.5 + Cloud Logging | Loguear todo y filtrar después |
| D14 | **Imports restringidos por capa** con lint (ver C) | Hace mecánica la regla de dependencias | Solo revisión de código |
| D15 | **Aislamiento de la BD de pruebas**: `TRUNCATE` por prueba, proyecto de integración sin paralelismo de ficheros; nunca la BD de Neon en pruebas | Pruebas deterministas | Transacción + rollback por prueba (Prisma no lo expone limpio con `$transaction` interactivo) |
| D16 | **Swagger UI solo fuera de producción** | API8/API9 | Público (el repo ya es público; aceptable si Anderson lo prefiere) |
| D17 | **TS estricto ampliado**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` | Calidad (RNF-07) | Solo `strict` |
| D18 | **Migraciones: `migrate deploy` en un paso del pipeline antes del despliegue**, con la URL directa; nunca `migrate dev` ni `db push` contra Neon | Neon y Prisma 7 | Migrar al arrancar el contenedor (choca con el arranque en frío y con los 10 s de apagado) |
| D19 | **El build del sitio reintenta** las lecturas a la API (arranque en frío Cloud Run + Neon) y falla de forma explícita si la API no responde; nunca publica con datos vacíos | RNF-02 y riesgo de arranque en frío | Un solo intento |

---

## E. Validación del backlog (manual §12)

**Cambios propuestos:**

| # | Rama | Cambio respecto al manual |
|---|---|---|
| 0 | `chore/monorepo-skeleton` | Añadir: decisión ESM/NodeNext, versiones fijadas (D1), Vitest 5 con `projects` (unit, integration, e2e) y umbrales por glob, `unplugin-swc` con una prueba que demuestre la DI por tipo, esqueleto de `packages/shared` (exports por subruta, catálogo de códigos vacío), docker compose de Postgres, CI con service container |
| 1 | `feat/api-foundation` | Añadir: `nestjs-pino`, `StandardSchemaValidationPipe` global con `exceptionFactory` → RFC 9457, `standardSchemaConverter` de Swagger + prueba del `openapi.json`, `trust proxy` + `ClientIpThrottlerGuard`, límite del body, `enableShutdownHooks`, `listen(PORT, '0.0.0.0')` |
| 1b | **`ci/deploy-api` adelantada** (antes era la 8) | Despliegue del esqueleto («walking skeleton») justo después de la 1. Valida pronto la IP real tras el proxy, el dominio de la API y la cookie (ver G1), los arranques en frío y WIF. Las migraciones se añaden cuando exista la 2 |
| 2 | `feat/db-schema` | **Bloqueada por las preguntas de F.** Incluir índices, `created_at`/`updated_at`, restricciones `CHECK` y `ON DELETE`, y el seed. Dos URL de Neon |
| 3 | `feat/content-read` | Esquemas de salida en `packages/shared/schemas/*` (solo los suyos). Prueba de número de consultas |
| 4 | `feat/contact-messages` | Esquema de entrada en `packages/shared/schemas/contact-message.ts`. Incluye RF-15 (aviso con Resend) |
| 5 | `feat/admin-auth` | **Añadir explícitamente:** guard de sesión global (D8), guard de origen/CSRF (D7), logout, `GET /v1/auth/me`, decisión de dominio (ADR previo) |
| 6 | `feat/admin-content` → **dividir** | 6a `feat/admin-technologies` (catálogo del que dependen proyectos, experiencia y habilidades) → luego en paralelo: 6b `feat/admin-projects` (+ decisiones y tecnologías), 6c `feat/admin-experience` (+ items), 6d `feat/admin-skills` (+ grupos), 6e `feat/admin-references` (RF-19), 6f **`feat/admin-profile`** (faltaba) |
| 7 | **`feat/contact-inbox`** (nueva, RF-14) | Listar paginado, marcar leído, archivar. Depende de 4 y 5 |
| 8 | `feat/publish-workflow` | Con antirrebote. Depende de 5 (y de que el workflow del sitio exista) |
| 9 | `ci/db-backup` | Sin cambios; depende de 2 y 1b |

**Faltan en el backlog** (no son ramas de backend, pero condicionan la API): el workflow del sitio que consume content-read y escucha `repository_dispatch`, y dónde vive el CV en PDF (RF-06) y la foto (¿estáticos en el repo o URL en `profile`?).

**Paralelismo (máximo 3 agentes):**
- Secuencial: 0 → 1 → {1b ∥ 2}.
- Tras 2: {3 ∥ 4 ∥ 5}. Todas tocan `app.module.ts`: el orquestador fusiona en orden y rebasa; el conflicto es de una línea.
- Tras 5 (y 6a): {6b ∥ 6c ∥ 6d}, luego {6e ∥ 6f ∥ 7}, y 8.
- `packages/shared`: cada rama crea **sus propios ficheros** de esquema (sin barrel), así que no hay conflicto. `codes.ts` sí es compartido: cada rama añade sus códigos al final y el orquestador secuencia.

---

## F. Huecos del modelo de datos (preguntas, no decisiones)

**reference**
1. Falta `linkedin_url` (obligatorio en RF-18, RF-19 y RNF-14). ¿Se añade como `text NOT NULL` validado contra el host `linkedin.com`?
2. Falta `display_order` (RF-19: «orden de aparición»). ¿Se añade?
3. El inventario pide «destacada»; el diagrama no la tiene. ¿Destacada = visible en el inicio, o todas las publicadas se muestran?
4. `authorized` y `published`: ¿una referencia puede estar `published=true` con `authorized=false`? ¿Se impide con un `CHECK (NOT published OR authorized)`?

**profile**
5. El inventario pide resumen largo, ubicación, correo público, `github_url`, `linkedin_url` y `cv_url`; el diagrama solo tiene name, headline, summary y photo_url. ¿Se añaden todos?
6. ¿Dónde viven la propuesta de valor (RF-01), los «datos destacados» del hero y las **tres tarjetas con icono de «Sobre mí»** (UX §5.1)? ¿En columnas, en una tabla hija o fijos en el código del sitio?
7. ¿`profile` es una sola fila? ¿Cómo se garantiza (id fijo o índice único sobre una constante)?
8. ¿El perfil tiene borrador y publicado?

**project**
9. El inventario distingue resumen y descripción; el diagrama tiene `summary` pero no `description`. ¿Se fusionan o falta la columna?
10. Falta `featured` («3 o 4 destacados», IA §10). ¿Se añade?
11. **El mini-diagrama de flujo de cada proyecto** (UX §5.1: pasos con icono más descripción textual para lectores de pantalla) no tiene tabla. ¿`project_flow_step(project_id, label, icon_key, display_order)`, una columna `jsonb` o queda fuera de la BD?
12. `code_access` (público/privado) y `repo_url`: ¿se exige con `CHECK` que `repo_url` exista si y solo si es público?
13. ¿El slug se valida en la BD (formato kebab sin tildes) o solo en el esquema?

**experience**
14. El inventario exige descripción y el diagrama no la tiene. ¿Se añade `description`?
15. `end_date` nulo = cargo actual: ¿confirmado?
16. Valores del enum `experience_item.kind`: ¿`metric` (cifras clave label/value), `responsibility` y `achievement`? Para las responsabilidades, `label` y `value` encajan mal. ¿Basta con `text`?
17. ¿La experiencia tiene borrador y publicado? El backlog 6 dice «con borrador y publicado», pero solo `project` y `reference` tienen `published`.

**skill, skill_group y technology**
18. `technology.category` (enum) y `skill_group` parecen dos clasificaciones paralelas. ¿Cuál manda en el sitio (RF-04)? ¿Sobra una?
19. `skill` no tiene `display_order` (el inventario sí lo pide). ¿Se añade?
20. `technology.icon_key` = slug de Simple Icons: ¿se valida contra una lista cerrada?

**contact_message**
21. Falta `subject` (opcional en el inventario). ¿Se añade?
22. Para «persistir antes de notificar» con reintentos, ¿se registra el estado del aviso (`notified_at` o `notification_status`)? Sin él no se puede reintentar ni saber qué correos fallaron.
23. ¿`read_at` y `archived_at`, o basta con `status` + `updated_at`?
24. Política de **retención** de mensajes (datos personales): ¿se borran pasado un tiempo?

**Transversal**
25. Solo `contact_message` tiene `created_at`. ¿Se añaden `created_at` y `updated_at` a todas las tablas? Sirven también para el `lastmod` del sitemap (RNF-04).
26. ¿El UUID lo genera la BD (`gen_random_uuid()`) o la app (¿v7?)?
27. ¿`display_order` debe ser único dentro de su ámbito? ¿Qué pasa al reordenar?
28. `ON DELETE`: cascada en las hijas (`project_decision`, `experience_item`, tablas puente) y `RESTRICT` al borrar una `technology` en uso. ¿Confirmado?
29. ¿Se guarda un registro de publicaciones (fecha del último dispatch) para el antirrebote y para mostrar «última publicación» en el panel? ¿O basta con memoria (se pierde al escalar a cero)?
30. Semántica de borrador: con un flag por fila, editar un elemento ya publicado lo cambia en el siguiente build, sea cual sea su origen (incluido un merge en `main`). ¿Es aceptable o se quiere una «versión publicada» separada? (Recomiendo aceptarlo: la complejidad de las instantáneas no compensa.)
31. Índices previstos: `project(published, display_order)`, `reference(published, display_order)`, `contact_message(status, created_at DESC)`, únicos en `project.slug` y `technology.name`. ¿Alguno más?

---

## G. Riesgos y preguntas abiertas

| # | Riesgo / pregunta | Impacto | Propuesta |
|---|---|---|---|
| G1 | **Dominio de la API y cookie de sesión.** Si el panel se sirve desde `<dominio>.dev` (Cloudflare) y la API desde `*.run.app`, la cookie es cross-site: obliga a `SameSite=None`, la bloquean los navegadores con protección de terceros y el CSRF se complica. El *domain mapping* de Cloud Run está en **Preview y «no recomendado para producción»** (https://docs.cloud.google.com/run/docs/mapping-custom-domains); el balanceador tiene coste | **Bloquea la rama 5** | Opciones para un ADR: (a) `api.<dominio>.dev` con domain mapping (Preview, `us-central1` soportada; mismo *site*, así que `SameSite=Lax`/`Strict` funciona); (b) proxy en Cloudflare (Worker o ruta `/api/*` en el mismo origen que el panel: misma origin, sin CORS); (c) LB global (coste, contra RNF-11). Recomiendo evaluar (b) y luego (a) |
| G2 | **Formato de `X-Forwarded-For` en Cloud Run** no documentado en el contrato | El limitador cuenta mal o se puede eludir | `trust proxy = 1` + `req.ip`; prueba manual con una cabecera inyectada en la rama de despliegue. Si se usa la opción G1-b, Cloudflare añade otro salto (`CF-Connecting-IP`) |
| G3 | **Revocación de la sesión sin estado** | No se puede expulsar una cookie robada antes de que expire | `exp` absoluto corto (p. ej. 8 h) y renovación por inactividad; rotar `SESSION_SECRET` = cerrar todas las sesiones; opcional `session_version` en config. Documentarlo en el ADR |
| G4 | Prisma: `latest` = 8.0.0-rc y discrepancia `prisma7.config.ts` / `prisma.config.ts` | Instalación incorrecta | Versión exacta 7.10.1; comprobar el nombre del config en el esqueleto |
| G5 | Nest 12 es reciente (12.0 publicada el 27-08) | Librerías del ecosistema rezagadas | Verificado: `nestjs-pino`, `@nestjs/throttler`, `@nestjs/swagger` y `@nestjs/config` declaran soporte para 12. El resto se comprueba antes de añadirlo |
| G6 | Swagger + Standard Schema: solo vi la doc en un espejo de las release notes | OpenAPI incompleto | Prueba de contrato en la rama 1 (D10) |
| G7 | Decoradores bajo Vitest (`emitDecoratorMetadata`) | DI rota en las pruebas | Prueba roja en el esqueleto |
| G8 | Arranque en frío Cloud Run + Neon durante el build | Build fallido o sitio vacío | D19 |
| G9 | Throttler en memoria: se reinicia al escalar a cero o al desplegar | Protección parcial (aceptable) | Documentado en ADR-8 (ver §8) |
| G10 | Umbral de cobertura: los globs del 90 % también cuentan en el 80 % global | Confusión al leer el informe | Documentarlo en `vitest.config.ts` |
| G11 | 400 frente a 422 para la validación | Contrato | ADR (propuesta en 1.5) |
| G12 | Turnstile y privacidad (RNF-14), pendiente en el doc de arquitectura | Puede eliminar una capa anti-spam | Con el puerto `CaptchaVerifier`, quitarlo cuesta un adaptador `NoopCaptcha` |
| G13 | Rutas del manual §2 desactualizadas (`requirements/01..03`, `profile/`): los ficheros se movieron a `discovery/`, y `03` y `profile/` están borrados en el árbol de trabajo | Los agentes no encuentran el inventario de contenido | Restaurar `03-information-architecture.md` o actualizar las rutas del manual |
| G14 | Numeración de ADR: el manual cita «ADR-008» para «API sin estado» y «/health sin BD», pero en el documento de arquitectura el ADR 8 es «límite en memoria»; la tabla de decisiones (1–15) y la lista de ADR (1–8) usan numeraciones distintas | Referencias cruzadas rotas | Fijar la numeración al redactar los ADR |
| G15 | Permisos del token para `repository_dispatch` con PAT fine-grained no documentados en la página consultada | Token con más permisos de los necesarios | Probar con `Contents: write` limitado al repo; alternativa: GitHub App |

---

## 8. ¿Contradicción entre «API sin estado» (manual) y «limitador en memoria» (ADR-8)?

**No es un conflicto real, pero la redacción actual del manual («sin sesión ni caché en memoria de proceso») lo hace parecer uno.** «Sin estado», en el sentido que importa para Cloud Run, significa que **ningún dato que deba sobrevivir a un reinicio, o que deba compartirse entre instancias**, vive en el proceso. Los contadores del throttler no cumplen ninguna de las dos condiciones:
- son **efímeros y descartables**: perderlos al escalar a cero solo regala una ventana de peticiones;
- con `max-instances = 1` (decisión de arquitectura) **no hay nada que compartir**.

El almacenamiento en memoria es además el por defecto de `@nestjs/throttler`, y la doc solo exige uno compartido (Redis) para varias instancias (https://docs.nestjs.com/security/rate-limiting). Lo mismo vale para el antirrebote de «Publicar» si se guarda en memoria.

**Redacción propuesta para el manual §7.5:**
> «La API no guarda en memoria del proceso ningún estado de negocio ni de sesión: la sesión viaja en una cookie firmada y los datos están en PostgreSQL. Se permite únicamente estado **efímero de protección** (contadores del limitador y, si aplica, el antirrebote de publicación), cuya pérdida no afecta a la corrección; es válido mientras `max-instances = 1` (ADR-8). Si se escala a más de una instancia, ese estado pasa a un almacén compartido o a la base de datos, y se revisa el ADR.»

Y corregir la cita «(ADR-008)» de «API sin estado» y del `/health` para que apunte al ADR que corresponda (G14).

---

## Fuentes (todas consultadas el 2026-10-24)

- NestJS: https://docs.nestjs.com/migration-guide · https://docs.nestjs.com/v11/migration-guide · https://github.com/nestjs/nest/releases/tag/v12.0.0 · https://docs.nestjs.com/techniques/validation · https://docs.nestjs.com/fundamentals/testing · https://docs.nestjs.com/recipes/swc · https://docs.nestjs.com/recipes/prisma · https://docs.nestjs.com/techniques/logger · https://docs.nestjs.com/techniques/configuration · https://docs.nestjs.com/security/rate-limiting · https://docs.nestjs.com/fundamentals/lifecycle-events · release de `@nestjs/swagger` 12.0.0 (espejo) https://newreleases.io/project/github/nestjs/swagger/release/12.0.0
- Prisma y Neon: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 · https://www.prisma.io/docs/orm/reference/prisma-config-reference · https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing · https://www.prisma.io/blog/testing-series-5-xWogenROXm · https://neon.com/docs/guides/prisma · https://neon.com/docs/guides/prisma-migrations
- Testcontainers: https://node.testcontainers.org/modules/postgresql/
- Vitest: https://vitest.dev/config/coverage · https://vitest.dev/guide/projects
- Zod: https://zod.dev/packages/mini
- OWASP: https://api-security.owasp.org/ · https://asvs.owasp.org/ · https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release · https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html · https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- RFC 9457: https://www.rfc-editor.org/rfc/rfc9457.html
- Google Cloud: https://docs.cloud.google.com/run/docs/container-contract · https://docs.cloud.google.com/run/docs/logging · https://docs.cloud.google.com/run/docs/mapping-custom-domains · https://docs.cloud.google.com/load-balancing/docs/https
- Express: https://expressjs.com/en/guide/behind-proxies.html
- Cloudflare: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- GitHub: https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/ · https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps · https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
- Arctic (deprecado): https://arctic.pilcrowonpaper.com/
- Versiones de npm (`npm view`, 2026-10-24): `@nestjs/core` 12.2.0; `@nestjs/swagger` 12.0.4; `@nestjs/config` 12.0.1; `@nestjs/throttler` 6.7.1; `nestjs-pino` 5.3.1; `prisma` latest 8.0.0-rc.27 / prev 7.10.1; `@prisma/adapter-pg` 7.10.1; `vitest` 5.0.5; `unplugin-swc` 2.0.0; `zod` 4.6.7; `valibot` 1.5.0; `zod-openapi` 6.0.2; `nestjs-zod` 5.5.0; `class-validator` 0.15.1; `helmet` 8.3.0; `arctic` 3.7.0; `passport-github2` 0.1.12; `@testcontainers/postgresql` 12.2.1.
