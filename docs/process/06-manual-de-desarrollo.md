# Manual de desarrollo con Claude Code

**Estado:** vigente desde 2026-10-24 · **Aplica a:** todo el desarrollo del repositorio, empezando por el backend.

Este manual es la fuente de verdad de _cómo_ se trabaja. Las reglas que no se negocian están resumidas en `CLAUDE.md` (raíz del repositorio), que Claude Code carga en cada sesión. Si algo de aquí contradice a `docs/architecture/05-arquitectura-tecnica.md`, manda el documento de arquitectura; cambiarlo exige un ADR y la aprobación de Anderson.

## 1. Roles

| Rol | Quién | Qué hace |
|---|---|---|
| Propietario | Anderson | Decide el alcance, aprueba el plan, el gasto y cualquier cambio a una decisión de la fase 5 |
| Orquestador | La sesión principal de Claude Code | Planifica, delega, integra y vigila las reglas. **No escribe código de producción**: lo delega |
| Agentes especializados | Subagentes de `.claude/agents/` | Ejecutan una tarea acotada en su propia rama y su propio árbol de trabajo |

## 2. Antes de escribir una línea de código (Fase 0, con puerta de aprobación)

1. **Leer, completos, los documentos de `docs/`**, en este orden: `requirements/01..03`, `profile/` (contenido), `design/04-ux-ui.md`, `architecture/05-arquitectura-tecnica.md` (y los diagramas de `architecture/img/`), `adr/` si existen, y este manual. Si falta alguno, detenerse y avisar. Resumir en pocas líneas qué restricciones del backend se derivan de cada uno, con los identificadores (RF-xx, RNF-xx).
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
- Configuración sugerida (confirmar que sigue vigente en la documentación de Claude Code):

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
6. Registrar el resultado en `docs/process/agentes-y-modelos.md`: tabla, motivo de cada modelo y fecha. Revisarla si se alcanzan límites de uso o la calidad decepciona.

## 5. Skills: búsqueda, verificación e instalación

Las skills son instrucciones que un agente carga y sigue: una skill maliciosa o mediocre es un riesgo real.

1. Usar la skill `find-skills`: `npx skills find <consulta>` busca y `npx skills add <paquete>` instala. Buscar por necesidad concreta (NestJS, TDD con Vitest, Prisma, seguridad de APIs, GitHub Actions, Cloud Run, accesibilidad…).
2. **Vetar antes de instalar**: instalaciones (preferir más de 1 000, desconfiar de menos de 100), reputación del autor (oficiales como `anthropics`, `vercel-labs`, `microsoft`), estrellas del repositorio (desconfiar de menos de 100) y **leer el `SKILL.md` completo**. Rechazar skills con `allowed-tools` amplios sin justificación, con comandos de shell inyectados (`` !`…` ``) sospechosos, o que pidan secretos o acceso a la red sin motivo.
3. Instalar **en el proyecto**, no globalmente, y sin saltarse las confirmaciones.
4. **Asignar** cada skill al agente que la necesita con el campo `skills:` de su frontmatter, que precarga su contenido al arrancar. Una skill marcada con `disable-model-invocation: true` no se puede precargar en subagentes. No dar a todos los agentes todas las skills: cada skill ocupa contexto.
5. Registrar en `docs/process/skills.md`: nombre, origen, versión o fecha, instalaciones y estrellas al instalar, agentes que la usan y motivo.
6. Las skills de autores reconocidos que cumplan los umbrales se pueden instalar tras la lectura del `SKILL.md`; **cualquier otra se somete a la aprobación de Anderson** con un resumen de lo que haría.

## 6. Ramas, árboles de trabajo y fusión

- **Una rama por funcionalidad**, creada desde `main` actualizada: `feat/<ámbito>-<descripción-corta>` (también `fix/`, `docs/`, `chore/`, `ci/`, `refactor/`). Nunca se trabaja ni se hace push directo a `main`.
- **Cada agente trabaja en su propio árbol de trabajo** (`git worktree add ../wt-<rama> -b <rama> origin/main`), de modo que dos agentes nunca comparten directorio. El agente solo toca los ficheros que se le asignaron.
- **Dos agentes no editan la misma rama a la vez.** Dentro de una funcionalidad el trabajo es secuencial (rojo → verde → refactor → revisión). Solo se paraleliza entre ramas independientes y con ficheros distintos.
- Funcionalidades con dependencias se encadenan: la siguiente se crea cuando la anterior se ha fusionado.
- Los ficheros compartidos que provocan conflictos (`pnpm-lock.yaml`, `app.module.ts`, el esquema de Prisma, los workflows) los toca **una sola rama a la vez**; el orquestador lo secuencia.
- Commits convencionales (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`, `ci:`), un commit de cierre por paso y mensajes en inglés (ver 7.4).
- **Pull request por rama**, con la plantilla, los criterios de aceptación, la lista de pruebas escritas primero y el resultado de las revisiones.
- **Fusión sin aplastar el historial** (merge commit o rebase, no _squash_): el historial rojo → verde es la evidencia de TDD.
- Se fusiona solo si: CI en verde, revisión de código y de seguridad aprobadas, auditoría TDD aprobada, documentación actualizada. Si hay duda, se deja el PR abierto y se avisa a Anderson.
- Prohibido: `--no-verify`, `git push --force` sobre ramas compartidas, reescribir `main`, commitear secretos.

## 7. Arquitectura del backend

### 7.1 Investigación obligatoria (Fase 0)

Antes de fijar la estructura, el orquestador delega una investigación con fuentes vigentes (documentación oficial de NestJS, Prisma, Vitest, OWASP, RFC) y propone las decisiones que falten como ADR. Resultado esperado: propuesta de estructura, patrones, convenciones y reglas adicionales, cada una con su motivo y alternativa. **No se adopta nada por moda**: el proyecto es pequeño y lo mantiene una persona.

### 7.2 Punto de partida recomendado (a validar o refutar con la investigación)

La investigación previa a este manual apunta a:

- **Monolito modular por funcionalidad** (una carpeta por módulo con su controlador, casos de uso, DTO, tests y módulo de Nest), no capas técnicas globales. Es lo que recomiendan las guías actuales para proyectos de este tamaño.
- **Capas y regla de dependencia donde hay lógica de negocio**: `controlador → caso de uso → puerto (interfaz) ← adaptador (Prisma, correo, GitHub)`. El dominio y los casos de uso no importan nada de Prisma ni de Nest cuando es práctico. En módulos que son CRUD puro (por ejemplo, leer tecnologías) **no se crean puertos ni capas «por si acaso»**: el sobrecoste no compensa. La investigación debe fijar el criterio exacto para decidir cuándo sí.
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
- **La API no devuelve texto para el visitante.** Devuelve un `code` estable; el sitio lo traduce al español. La única excepción son las reglas de validación de `packages/shared`, que producen mensajes ya en español porque se muestran tal cual en el formulario.
- **Los slugs** son contenido: en minúsculas, sin tildes y con guiones (`migracion-bre-b`).
- **Vocabulario del dominio** en inglés y siempre el mismo: `project`, `experience`, `skill`, `reference`, `contact message`, `technology`.
- Los comentarios explican el _porqué_, no repiten el código. Un docstring solo donde aporte (API pública de un módulo, comportamiento no evidente).
- Los linters comprueban lo que se pueda (nomenclatura, ficheros en kebab-case); la revisión de código vigila el resto.

### 7.5 Reglas adicionales propuestas (verificar y refinar en la Fase 0)

- **Configuración validada al arrancar** con esquema (fallar rápido si falta algo) y sin leer `process.env` fuera del módulo de configuración.
- **Errores en un único formato**: filtro global que responde con `application/problem+json` (RFC 9457) y nunca filtra trazas ni detalles internos.
- **DTO de entrada y de salida separados de las entidades**; nunca se devuelve un modelo de Prisma directamente. Validación con `class-validator` y `whitelist` + `forbidNonWhitelisted`.
- **Contrato documentado** con OpenAPI (`@nestjs/swagger`), generado desde el código, y versionado de la API desde el principio.
- **Registro estructurado** (JSON) con identificador de correlación, sin datos personales ni secretos.
- **Base de datos**: migraciones versionadas y revisadas, cambios compatibles hacia atrás (ampliar, migrar, reducir), transacciones en operaciones de varios pasos, índices justificados, y la dirección «con pool» de Neon.
- **API sin estado** (ADR-008): sin sesión ni caché en memoria de proceso; la sesión del panel va en cookie firmada, `httpOnly`, `secure` y `sameSite`.
- **Seguridad**: contrastar la API con el OWASP API Security Top 10 (usar la edición vigente) y con los requisitos aplicables de OWASP ASVS; CORS restringido, `helmet`, límite de peticiones, validación de toda entrada, secretos solo en Secret Manager, dependencias auditadas en CI, sin datos reales en pruebas.
- **El `/health` no toca la base de datos** (ADR-008).
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

| # | Rama | Contenido |
|---|---|---|
| 0 | `chore/monorepo-skeleton` | pnpm workspaces, `apps/api`, `packages/shared`, linters, Vitest, commitlint, `docker compose` con PostgreSQL, CI mínimo (lint, tipos, pruebas) y README. Cada pieza con una prueba primero cuando tenga lógica |
| 1 | `feat/api-foundation` | configuración validada, `/health` sin base de datos, filtro de errores RFC 9457, registro estructurado, CORS, `helmet`, límite de peticiones, OpenAPI |
| 2 | `feat/db-schema` | esquema de Prisma 7 con las 12 tablas, migración inicial, datos iniciales y pruebas de integración con PostgreSQL |
| 3 | `feat/content-read` | endpoints de lectura del contenido **publicado** para el build del sitio |
| 4 | `feat/contact-messages` | formulario: validación (reglas de `packages/shared`), campo trampa, Turnstile tras un puerto, persistir y luego notificar con Resend tras un puerto |
| 5 | `feat/admin-auth` | entrar con GitHub (OAuth), lista de permitidos, sesión en cookie firmada |
| 6 | `feat/admin-content` | CRUD protegido de proyectos, experiencia, habilidades y referencias, con borrador y publicado |
| 7 | `feat/publish-workflow` | botón Publicar: `repository_dispatch` a GitHub tras un puerto |
| 8 | `ci/deploy-api` | Dockerfile, despliegue en Cloud Run con Workload Identity Federation, secretos en Secret Manager |
| 9 | `ci/db-backup` | volcado semanal cifrado a Cloud Storage y prueba de restauración |

Las ramas 0 a 2 son secuenciales. Después, 3 y 4 pueden ir en paralelo (módulos distintos) si no tocan los mismos ficheros compartidos.
