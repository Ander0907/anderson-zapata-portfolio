# Manual de desarrollo con Claude Code

**Estado:** vigente desde 2026-10-24 · **Aplica a:** todo el desarrollo del repositorio, empezando por el backend.

Este manual es la fuente de verdad de _cómo_ se trabaja. Las reglas que no se negocian están resumidas en `CLAUDE.md` (raíz del repositorio), que Claude Code carga en cada sesión. Si algo de aquí contradice a `docs/architecture/05-arquitectura-tecnica.md`, manda el documento de arquitectura; cambiarlo exige un ADR y la aprobación de Anderson. `docs/architecture/backend-research-definition.md` recoge las decisiones del backend de la Fase 0; donde este manual o un ADR lo actualizaron después (por ejemplo, el aplazamiento de la rama 1b), mandan el manual y el ADR. Mientras un ADR citado no exista todavía en `docs/adr/`, su contenido es el de la definición, sección 6.

## 1. Roles

| Rol | Quién | Qué hace |
|---|---|---|
| Propietario | Anderson | Decide el alcance, aprueba el plan, el gasto y cualquier cambio a una decisión de la fase 5 |
| Orquestador | La sesión principal de Claude Code | Planifica, delega, integra y vigila las reglas. **No escribe código de producción**: lo delega |
| Agentes especializados | Subagentes de `.claude/agents/` | Ejecutan una tarea acotada en su propia rama y su propio árbol de trabajo |

## 2. Antes de escribir una línea de código (Fase 0, con puerta de aprobación)

1. **Leer, completos, los documentos de `docs/`**, en este orden: `discovery/01-discovery.md`, `requirements/02-requirements.md`, `content/03-information-architecture.md` y `content/draft-content.md` (contenido), `design/04-ux-ui.md`, `architecture/05-arquitectura-tecnica.md` (y los diagramas de `architecture/img/`), `architecture/backend-research-definition.md` (decisiones del backend aprobadas en la Fase 0), `adr/` si existen, y este manual. Si falta alguno, detenerse y avisar. Resumir en pocas líneas qué restricciones del backend se derivan de cada uno, con los identificadores (RF-xx, RNF-xx).
2. **Auditar los agentes instalados** (sección 4).
3. **Buscar y vetar skills** (sección 5).
4. **Investigar** la arquitectura del backend con documentación vigente, no de memoria (sección 7).
5. **Presentar a Anderson el plan** (tabla de agentes y modelos, skills propuestas, arquitectura, backlog por ramas) y **esperar su aprobación** antes de la Fase 1.

## 3. Orquestación

- El orquestador **delega siempre** en el agente cuya descripción mejor encaje con la tarea. Si ninguno encaja, crea uno en `.claude/agents/` (sección 4) en vez de hacer el trabajo él mismo.
- Los agentes **no crean más agentes**: se desactiva el anidamiento con `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` (por defecto se permiten hasta tres niveles). Así el orquestador conserva el control.
- Concurrencia: como máximo **3 agentes a la vez** (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=3`; por defecto son 20). Cada agente gasta sus propios tokens.
- Cada encargo a un agente incluye: objetivo, criterios de aceptación, ficheros que puede tocar, rama y ruta de su árbol de trabajo, documentos a respetar y qué entregar. Los informes de vuelta son **breves** (qué hizo, resultado de las pruebas, riesgos).
- El orquestador verifica el resultado él mismo (ejecuta las pruebas, lee el diff). Un «listo» de un agente no es evidencia.
- Configuración aplicada en `.claude/settings.json` (variables verificadas en la documentación de Claude Code el 2026-10-24; requieren la versión 2.1.217 o posterior y se aplican al iniciar la sesión):

```json
{
  "env": {
    "CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH": "1",
    "CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS": "3"
  }
}
```

## 4. Auditoría de agentes y asignación de modelos

1. Listar todos los agentes disponibles: `.claude/agents/`, `~/.claude/agents/` y los de plugins. Para cada uno, anotar nombre, descripción, `tools`, `model` y `skills`.
2. Decidir para cada agente si **se conserva, se ajusta o se descarta**, y qué agentes faltan. Roles mínimos esperados: desarrollo backend (NestJS), ingeniería de pruebas (TDD), base de datos (Prisma/PostgreSQL), seguridad, DevOps (CI/CD y Docker), revisión de código y documentación.
3. **Elegir el modelo** de cada uno con criterio de complejidad y coste y escribirlo en el campo `model` de su frontmatter (acepta un alias como `sonnet`, `opus`, `haiku`, `fable`, un identificador completo o `inherit`). Propuesta inicial, a validar en la auditoría (la implementación en `opus` es decisión de Anderson y no se cambia sin consultarle, aunque se agoten límites de uso: en ese caso se avisa):

| Tipo de trabajo | Modelo | Motivo |
|---|---|---|
| Decisiones de arquitectura, revisión de seguridad, auditoría TDD | El más capaz (`opus`) | Un error aquí se propaga a todo |
| Implementación de funcionalidades (código de producción) | `opus` | Decisión de Anderson (2026-10-24): es donde más pesa la calidad del diseño y del código |
| Pruebas, base de datos, DevOps | `sonnet` | Buen equilibrio entre calidad y coste |
| Documentación, formato, búsquedas mecánicas | `haiku` | Tareas simples y repetitivas |

4. Comprobar que ninguna variable de entorno pisa la elección (`CLAUDE_CODE_SUBAGENT_MODEL` con `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` fuerza un modelo a todos). La elección efectiva se resuelve así: parámetro de la invocación, `model` del agente, variable de entorno, modelo de la sesión.
5. Para crear o modificar agentes se usa el **agente especializado en configurar agentes** si existe; si no, el orquestador lo hace y deja constancia. Los cambios en agentes del usuario (`~/.claude/agents/`) se **consultan con Anderson**; los del proyecto (`.claude/agents/`) se hacen y se commitean.
6. Registrar el resultado en `docs/process/agents-and-models.md`: tabla, motivo de cada modelo y fecha. Revisarla si se alcanzan límites de uso o la calidad decepciona.

## 5. Skills: búsqueda, verificación e instalación

Las skills son instrucciones que un agente carga y sigue: una skill maliciosa o mediocre es un riesgo real.

1. Usar la skill `find-skills`: `npx skills find <consulta>` busca y `npx skills add <paquete>` instala. Buscar por necesidad concreta (NestJS, TDD con Vitest, Prisma, seguridad de APIs, GitHub Actions, Cloud Run, accesibilidad…).
2. **Vetar antes de instalar**: instalaciones (preferir más de 1 000, desconfiar de menos de 100), reputación del autor (oficiales como `anthropics`, `vercel-labs`, `microsoft`), estrellas del repositorio (desconfiar de menos de 100) y **leer el `SKILL.md` completo**. Rechazar skills con `allowed-tools` amplios sin justificación, con comandos de shell inyectados (`` !`…` ``) sospechosos, o que pidan secretos o acceso a la red sin motivo.
3. Instalar **en el proyecto**, no globalmente, y sin saltarse las confirmaciones.
4. **Asignar** cada skill al agente que la necesita con el campo `skills:` de su frontmatter, que precarga su contenido al arrancar. Una skill marcada con `disable-model-invocation: true` no se puede precargar en subagentes. No dar a todos los agentes todas las skills: cada skill ocupa contexto.
5. Registrar en `docs/process/skills.md`: nombre, origen, versión o fecha, instalaciones y estrellas al instalar, agentes que la usan y motivo.
6. Las skills de autores reconocidos que cumplan los umbrales se pueden instalar tras la lectura del `SKILL.md`; **cualquier otra se somete a la aprobación de Anderson** con un resumen de lo que haría.

## 6. Ramas, árboles de trabajo y fusión

- **Flujo de ramas DEV → UAT → PDN** (decisión de Anderson, 2026-10-24): `development` es integración (DEV), `release` es aceptación (UAT) y `main` es producción (PDN).
  - **Una rama por funcionalidad**, creada desde `development` actualizada: `feat/<ámbito>-<descripción-corta>` (también `fix/`, `docs/`, `chore/`, `ci/`, `refactor/`). Su PR va a `development` con el título «to DEV: <mensaje convencional>».
  - **Promociones:** PR `development` → `release` («to UAT: …») y `release` → `main` («to PDN: …»). Las abre el orquestador **solo cuando Anderson lo pide o lo aprueba**, porque `main` es lo que se despliega.
  - Nunca se trabaja ni se hace push directo a `development`, `release` ni `main`.
- **Cada agente trabaja en su propio árbol de trabajo** (`git worktree add ../wt-<rama> -b <rama> origin/development`), de modo que dos agentes nunca comparten directorio. El agente solo toca los ficheros que se le asignaron.
- **Dos agentes no editan la misma rama a la vez.** Dentro de una funcionalidad el trabajo es secuencial (rojo → verde → refactor → revisión). Solo se paraleliza entre ramas independientes y con ficheros distintos.
- Funcionalidades con dependencias se encadenan: la siguiente se crea cuando la anterior se ha fusionado.
- Los ficheros compartidos que provocan conflictos (`pnpm-lock.yaml`, `app.module.ts`, el esquema de Prisma, los workflows) los toca **una sola rama a la vez**; el orquestador lo secuencia.
- Commits convencionales (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`, `ci:`), un commit de cierre por paso y mensajes en inglés (ver 7.4).
- **Pull request por rama**, con la plantilla, los criterios de aceptación, la lista de pruebas escritas primero y el resultado de las revisiones.
- **Fusión sin aplastar el historial** (merge commit o rebase, no _squash_): el historial rojo → verde es la evidencia de TDD.
- Se fusiona solo si: CI en verde, revisión de código y de seguridad aprobadas, auditoría TDD aprobada, documentación actualizada. Si hay duda, se deja el PR abierto y se avisa a Anderson.
- Prohibido: `--no-verify`, `git push --force` sobre ramas compartidas, reescribir `development`, `release` o `main`, commitear secretos.

## 7. Arquitectura del backend

### 7.1 Investigación obligatoria (Fase 0)

Antes de fijar la estructura, el orquestador delega una investigación con fuentes vigentes (documentación oficial de NestJS, Prisma, Vitest, OWASP, RFC) y propone las decisiones que falten como ADR. Resultado esperado: propuesta de estructura, patrones, convenciones y reglas adicionales, cada una con su motivo y alternativa. **No se adopta nada por moda**: el proyecto es pequeño y lo mantiene una persona.

### 7.2 Arquitectura aprobada en la Fase 0

Se aprueba (Fase 0, 2026-10-24):

- **Monolito modular por funcionalidad** (una carpeta por módulo con su controlador, casos de uso, DTO, tests y módulo de Nest), no capas técnicas globales. Es lo que recomiendan las guías actuales para proyectos de este tamaño.
- **Capas y regla de dependencia donde hay lógica de negocio**: `controlador → caso de uso → puerto (interfaz) ← adaptador (Prisma, correo, GitHub)`. El dominio y los casos de uso no importan nada de Prisma ni de Nest; la única excepción es `@nestjs/common`, permitido en `application/` solo para `@Injectable` e `@Inject`. En módulos que son CRUD puro (por ejemplo, leer tecnologías) **no se crean puertos ni capas «por si acaso»**: el sobrecoste no compensa.
- **Criterio exacto (ADR-017), aplicado por operación y no por módulo.** Basta un «sí» y se crea solo lo que esa pregunta activa:
  - **H1:** ¿llama a un sistema externo distinto de PostgreSQL? → puerto y adaptador para ese sistema.
  - **H2:** ¿coordina dos o más efectos con un orden o una semántica de fallo que importen? → caso de uso y puerto de repositorio.
  - **H3:** ¿tiene una regla de negocio que no es validación de forma? → función o clase de dominio pura.
  - **H4:** ¿su resultado depende del reloj o del azar? → inyectar `Clock` o `IdGenerator`.
  - Si todo es «no»: CRUD plano (`controlador → servicio → Prisma`, con mapper de salida), probado con PostgreSQL real y **sin simular Prisma**. Una carpeta `domain/` o `application/` que ninguna pregunta justifique se rechaza en la revisión.
- **Puertos y adaptadores** para lo que cambia o se simula en las pruebas: persistencia, envío de correo (Resend), verificación de Turnstile, disparo del despliegue en GitHub, reloj y generación de identificadores. Los puertos se inyectan con tokens; los adaptadores se enlazan en el módulo.
- **Dobles de prueba**: repositorios en memoria para pruebas unitarias rápidas; PostgreSQL real para las de integración.

### 7.3 Principios y patrones

- **SOLID** aplicado con criterio (responsabilidad única por caso de uso, dependencias hacia abstracciones, módulos cerrados a modificación para la integración con terceros).
- **Patrones** cuando resuelven un problema concreto y presente: Repository (persistencia), Strategy o Adapter (proveedores externos), Factory/Builder (datos de prueba), Mapper (entidad ↔ DTO), Guard/Interceptor/Filter de Nest para lo transversal. Cada patrón usado se nombra en el código o en el ADR y se justifica; sin patrones decorativos.
- Código limpio y tipado: TypeScript estricto, sin `any`, funciones cortas, nombres que expliquen la intención, sin comentarios que repitan el código, errores de dominio tipados.

### 7.4 Idioma y nomenclatura

El código se escribe en **inglés**; lo que lee una persona del sitio, en **español**. La frontera es esta:

| Elemento | Idioma | Ejemplo |
|---|---|---|
| Identificadores (variables, funciones, clases, tipos, módulos, ficheros y carpetas de código) | Inglés | `ContactMessageService`, `contact-message.service.ts` |
| Comentarios, TSDoc/docstrings y mensajes de log | Inglés | `/** Persists the message before notifying. */` |
| Endpoints de la API, parámetros y campos JSON | Inglés, en minúsculas con guiones | `POST /v1/contact-messages`, `{ "displayOrder": 1 }` |
| Tablas y columnas de la base de datos | Inglés, `snake_case` | `experience_item`, `display_order` |
| Descripciones de las pruebas y datos de prueba | Inglés | `it('persists the message before notifying')` |
| Commits, ramas, PR e issues | Inglés | `feat(contact): persist message before sending email` |
| Código de error de la API (`code`) y `detail` de `problem+json` | Inglés; el `code` es estable | `{ "code": "CONTACT_MESSAGE_TOO_LONG" }` |
| Texto visible para el visitante (interfaz, mensajes de validación del formulario, metadatos SEO, contenido del portafolio) | **Español** | «Escribe un correo válido» |
| **URLs públicas del sitio** (las páginas) | **Español**, en minúsculas, sin tildes ni eñes y con guiones | `/proyectos`, `/proyectos/{slug}`, `/experiencia`, `/contacto`, `/arquitectura` |
| Documentación del repositorio (README, ADR, `docs/`) | Español | — |
| Nombres de los ficheros de `docs/` | Inglés, en minúsculas con guiones | `docs/adr/adr-001-monorepo.md` |

Reglas de aplicación:

- **Las páginas públicas van en español** porque son lo que ve el visitante, se comparte y se indexa. En Next.js la ruta sale del nombre de la carpeta (`app/proyectos/`), así que es una excepción deliberada a «carpetas de código en inglés». Los componentes, funciones y tipos de esas páginas siguen en inglés.
- **El panel de administración** (`/admin/...`) **va en inglés**: no es público ni se indexa, y mantiene su vocabulario alineado con la API y el código. Su interfaz visible sigue en español.
- **La API no devuelve texto para el visitante.** Devuelve un `code` estable; el sitio lo traduce al español. Los esquemas de validación de `packages/shared` también emiten códigos (`EMAIL_INVALID`), y `packages/shared/src/messages/es.ts` los traduce para el formulario (ADR-009). No hay excepciones.
- **Los slugs** son contenido: en minúsculas, sin tildes y con guiones (`migracion-bre-b`).
- **Vocabulario del dominio** en inglés y siempre el mismo: `project`, `experience`, `skill`, `reference`, `contact message`, `technology`.
- Los comentarios explican el _porqué_, no repiten el código. Un docstring solo donde aporte (API pública de un módulo, comportamiento no evidente).
- Los linters comprueban lo que se pueda (nomenclatura, ficheros en kebab-case); la revisión de código vigila el resto.

### 7.5 Reglas adicionales (aprobadas en la Fase 0)

- **Configuración validada al arrancar** con esquema (fallar rápido si falta algo) y sin leer `process.env` fuera del módulo de configuración.
- **Errores en un único formato**: filtro global que responde con `application/problem+json` (RFC 9457) y nunca filtra trazas ni detalles internos.
- **DTO de entrada y de salida separados de las entidades**; nunca se devuelve un modelo de Prisma directamente. Validación con **Zod 4** mediante el soporte de Standard Schema de NestJS 12 (ADR-009): esquemas en `packages/shared`, compartidos con la web, con `z.strictObject` (rechaza campos no esperados) y `max()` en todo texto y lista. No se usa `class-validator`.
- **Contrato documentado** con OpenAPI (`@nestjs/swagger`), generado desde el código, y versionado de la API desde el principio.
- **Registro estructurado** (JSON) con identificador de correlación, sin datos personales ni secretos.
- **Base de datos**: migraciones versionadas y revisadas, cambios compatibles hacia atrás (ampliar, migrar, reducir), transacciones en operaciones de varios pasos e índices justificados. Neon tiene dos direcciones (ADR-019): `DATABASE_URL` (con pool) para la aplicación y `DATABASE_URL_UNPOOLED` (directa) para las migraciones. Las migraciones son un paso aparte del pipeline (`migrate deploy`) antes de desplegar; nunca se ejecuta `migrate dev` ni `db push` contra Neon, y las pruebas nunca tocan Neon. Prisma se fija en 7.10.1 exacto.
- **API sin estado** (ADR-008): la API no guarda en memoria del proceso ningún estado de negocio ni de sesión: la sesión viaja en una cookie firmada (`__Host-`, `httpOnly`, `secure`, `sameSite=Strict`) y los datos están en PostgreSQL. Se permite únicamente estado **efímero de protección** (los contadores del limitador), cuya pérdida no afecta a la corrección; es válido mientras `max-instances = 1`. Si se escala a más de una instancia, ese estado pasa a un almacén compartido o a la base de datos, y se revisa el ADR. El antirrebote de «Publicar» se guarda en la base de datos (`publish_event`).
- **Seguridad**: contrastar la API con el OWASP API Security Top 10 (usar la edición vigente) y con los requisitos aplicables de OWASP ASVS; sin CORS con origen único (ADR-011; lista explícita de orígenes solo en el plan B), `helmet`, límite de peticiones, validación de toda entrada, secretos solo en Secret Manager, dependencias auditadas en CI, sin datos reales en pruebas.
- **El `/health` no toca la base de datos** (ADR-016).
- **Reglas D1–D19**, aprobadas en `docs/architecture/backend-research-definition.md` (sección 3.4); la lista completa, con motivo y alternativa de cada una (incluidas D14 importaciones restringidas por capa, D15 aislamiento de la base de pruebas y D17 TypeScript estricto ampliado), está en `docs/architecture/backend-research.md`, sección D. Resumen: versiones exactas, ESM y Node 22, esquemas que emiten códigos, límite del cuerpo de 16 kB, tiempos máximos y reintentos acotados, panel cerrado por defecto con guard de origen, contrato `openapi.json` versionado, listados paginados (máximo 50), sin registrar cuerpos de petición, Swagger solo fuera de producción.
- **Persistir antes de notificar**: el mensaje de contacto se guarda siempre; el fallo del correo no lo pierde ni rompe la respuesta.
- **Idempotencia y reintentos acotados** en la integración con GitHub y con el correo.
- **Contenedor**: imagen multi-etapa, usuario sin privilegios, apagado ordenado, escucha en `PORT` y `0.0.0.0`.

## 8. TDD obligatorio

Ningún código de producción existe sin una prueba que fallara antes por la razón correcta.

1. **Rojo**: el agente de pruebas escribe la prueba a partir de los criterios de aceptación y comprueba que **falla**. Se commitea (`test:`).
2. **Verde**: el agente de implementación escribe lo mínimo para que pase. Se commitea (`feat:` o `fix:`).
3. **Refactor**: se limpia con las pruebas en verde. Se commitea (`refactor:`).
4. **Auditoría TDD**: antes de fusionar, un agente revisor comprueba en el historial de la rama que cada prueba precede a su código (commits `test:` antes de `feat:`), que las pruebas verifican comportamiento y no detalles internos, y que no hay pruebas desactivadas ni sin aserciones. Si el orden se rompió, la rama no se fusiona.
5. Pirámide: muchas pruebas unitarias (casos de uso con dobles en memoria), pruebas de integración con PostgreSQL real (contenedor de servicio en CI) para adaptadores y migraciones, pocas pruebas e2e de la API con supertest.
6. **Umbrales de cobertura en CI**: al menos 90 % en casos de uso y dominio y 80 % global (ajustables con ADR). La cobertura mide, no demuestra: una prueba sin aserciones no cuenta.
7. Los errores se reproducen primero con una prueba que falla (`fix:` siempre lleva su prueba).
8. Sin dependencias del reloj, del azar ni de la red en las pruebas unitarias.

## 9. Definición de «hecho» de una funcionalidad

- [ ] Criterios de aceptación cumplidos y trazables a RF/RNF.
- [ ] Historial rojo → verde → refactor, con auditoría TDD aprobada.
- [ ] Lint, tipos, pruebas y cobertura en verde en CI.
- [ ] Revisión de código y de seguridad aprobadas (hallazgos críticos resueltos).
- [ ] Contrato OpenAPI actualizado; migraciones incluidas si hay cambios de datos.
- [ ] Documentación actualizada (README, ADR si hubo decisión nueva, este manual si cambió el proceso).
- [ ] Sin secretos, sin código muerto, sin TODO sin issue.
- [ ] PR con la plantilla completa, fusionado sin aplastar historial.

## 10. Cuándo detenerse y preguntar a Anderson

- Cualquier gasto, cuenta nueva, tarjeta o credencial.
- Una acción destructiva o irreversible (borrar datos, reescribir historial, cambiar permisos).
- Un requisito ambiguo o que contradice un documento.
- Un cambio a una decisión de la fase 5 o al alcance.
- Una skill o agente que no pasa el filtro de la sección 5.
- Algo que no se puede verificar (por ejemplo, un límite de plan gratuito que no se encuentra documentado).

## 11. Comunicación y registro

- Informes breves y en español; el código, los commits y los nombres técnicos, en inglés (ver 7.4).
- Al final de cada funcionalidad: qué se hizo, evidencia (resultado de pruebas, enlace al PR), riesgos y siguiente paso. Sin relatar los pasos intermedios.
- Los incidentes y aprendizajes del proceso se anotan en este manual.

## 12. Backlog inicial del backend (cada punto, una rama)

Fuente: `docs/architecture/backend-research-definition.md`, sección 5, con un cambio decidido por Anderson el 2026-10-24: **el despliegue (`ci/deploy-api`) se pospone hasta después de las pruebas locales**; entonces se revisan los temas de despliegue.

| Orden | Rama | Depende de | Contenido |
|---|---|---|---|
| — | `chore/dev-process` | — | Agentes, skills, configuración de Claude Code, `CLAUDE.md` y este manual actualizado |
| — | `docs/adr-initial` | `chore/dev-process` | Los 20 ADR (001–020). En paralelo con la 0: solo toca `docs/adr/` |
| 0 | `chore/monorepo-skeleton` | `chore/dev-process` | pnpm workspaces, ESM y NodeNext, Node 22, versiones exactas, `apps/api` (NestJS 12), `packages/shared` (exports por subruta, sin barrel), linters con las restricciones de importación, Vitest 5 con tres proyectos (unit, integration, e2e) y umbrales por carpeta, una prueba que demuestra la inyección por tipo (sin `unplugin-swc`: Vite 8 emite los metadatos, ADR-010), commitlint, `docker compose` con PostgreSQL, CI con service container y README |
| 1 | `feat/api-foundation` | 0 | Configuración validada con Zod, `/health` sin base de datos, `nestjs-pino`, validación con Standard Schema, errores RFC 9457 (400/422), CORS, `helmet`, límite del cuerpo, límite de peticiones con `trust proxy` y `req.ip`, OpenAPI con prueba del contrato, apagado ordenado |
| 2 | `feat/db-schema` | 1 | Prisma 7.10.1, las **15 tablas** con restricciones e índices, migración inicial, datos iniciales, las dos URL de Neon, diagrama relacional actualizado y pruebas de integración con PostgreSQL |
| 3 | `feat/content-read` | 2 | Lectura del contenido **publicado** para el build; prueba de número de consultas si es viable |
| 4 | `feat/contact-messages` | 2 | Esquema compartido, campo trampa, Turnstile y Resend tras puertos, persistir y luego notificar, `notification_status` |
| 5 | `feat/admin-auth` | 2 | Adaptador OAuth propio con PKCE, lista de permitidos (login e id), sesión HMAC de 8 h, guard global cerrado por defecto, guard de origen y cabecera obligatoria, `logout` y `me`. Se desarrolla y prueba en local con el modelo de origen único (ADR-011); el reenvío por Cloudflare se valida en `ci/deploy-api` |
| 6a | `feat/admin-technologies` | 5 | Catálogo que usan las demás |
| 6b / 6c / 6d | `feat/admin-projects`, `feat/admin-experience`, `feat/admin-skills` | 6a | En paralelo |
| 6e / 6f / 7 | `feat/admin-references`, `feat/admin-profile`, `feat/contact-inbox` | 5 | En paralelo. La bandeja (RF-14) es paginada e incluye «reenviar aviso» |
| 8 | `feat/publish-workflow` | 5 | `repository_dispatch` tras un puerto y antirrebote con `publish_event` |
| 9 | `ci/deploy-api` | Pruebas locales completas y decisión de Anderson | Dockerfile, Cloud Run con Workload Identity Federation, Secret Manager, migraciones como paso previo, prueba del dominio único con Cloudflare y de la IP real |
| 10 | `ci/db-backup` | 2 y 9 | Volcado semanal cifrado a Cloud Storage y prueba de restauración |

Como máximo 3 agentes a la vez. Las ramas que tocan ficheros compartidos (`app.module.ts`, `packages/shared/src/errors/codes.ts`, `pnpm-lock.yaml`, el esquema de Prisma, los workflows) las integra el orquestador una tras otra.
