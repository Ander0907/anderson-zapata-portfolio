# Definición del backend: respuestas a la investigación de Fase 0

**Fecha:** 2026-10-24 · **Responde a:** «Investigación de arquitectura del backend (Fase 0, manual §7.1)» · **Autor de las respuestas:** tech lead, con tres decisiones personales de Anderson (marcadas con 👤).

**Cómo leerlo.** Cada duda del agente tiene la misma forma: _qué preguntaba_, _en palabras sencillas_, _decisión_ y _por qué_. Al final hay una lista de lo que Claude Code debe cambiar en los documentos y de lo que tienes que hacer tú.

**Estado de las respuestas.** Las tres marcadas con 👤 las decidiste tú. El resto son recomendaciones mías; pasan a ser definitivas cuando le des el visto bueno a este documento. Cualquier cambio posterior se hace con un ADR (una nota corta que explica una decisión).

---

## 0. Glosario mínimo

| Término | Qué significa |
|---|---|
| **ADR** | Una nota de una página que registra una decisión técnica, por qué se tomó y qué alternativas se descartaron |
| **Cookie de sesión** | Un pequeño dato que el navegador guarda para recordar que ya iniciaste sesión en el panel |
| **Cross-site / mismo sitio** | Si la web y la API están en dominios distintos (`tudominio.dev` y `algo.run.app`), el navegador trata la cookie con desconfianza o la bloquea |
| **CSRF** | Un ataque en el que otra página intenta hacer que tu navegador envíe una orden a tu panel aprovechando que tienes la sesión abierta |
| **Esquema (Zod)** | Una «plantilla» que describe cómo debe ser un dato (por ejemplo, un correo con una arroba). La misma plantilla sirve en la web y en la API |
| **Migración** | Un archivo que cambia la estructura de la base de datos de forma ordenada y repetible |
| **Pooled / directa (Neon)** | Neon da dos direcciones de conexión: la _pooled_ reparte conexiones y se usa en el día a día; la _directa_ se usa solo para las migraciones |
| **Puerto y adaptador** | El puerto es una «enchufe» definido por nosotros (por ejemplo, «enviar aviso»); el adaptador es la pieza que lo conecta con un servicio real (Resend). Permite probar sin internet y cambiar de proveedor |
| **Caso de uso** | Una clase que coordina varios pasos con un orden importante (por ejemplo, guardar el mensaje y luego avisar) |
| **CRUD plano** | Crear, leer, actualizar y borrar sin reglas complicadas: controlador → servicio → base de datos |
| **ESM** | El formato moderno de módulos de JavaScript. Es el que usan por defecto las versiones nuevas de las herramientas |
| **Service container** | Una base de datos PostgreSQL de usar y tirar que GitHub levanta mientras corren las pruebas |

---

## 1. Resumen: qué se decide

| # | Tema | Decisión | En una frase |
|---|---|---|---|
| 1 | Validación de datos | **Zod 4** compartido entre web y API | Una sola plantilla; la web pesa menos y Nest 12 la entiende de serie |
| 2 | Versión de Prisma | **7.10.1 exacta**, nunca «latest» | El «latest» de hoy es una versión de pruebas (8.0 RC) |
| 3 | Neon | Dos URL: **pooled** para la app y **directa** para migraciones | Evita un error típico al migrar |
| 4 | Login con GitHub | **Adaptador propio** de unas 80 líneas, con pruebas y revisión de seguridad especial | Las librerías disponibles están abandonadas o deprecadas |
| 5 | Límite de peticiones | `trust proxy = 1` y leer `req.ip`; comprobarlo en Cloud Run real | El ejemplo oficial se puede falsificar |
| 6 | Dominio de la API y cookie 👤 | **Mismo dominio a través de Cloudflare**; si falla, `api.tudominio.dev` | Que el navegador no bloquee la sesión del panel |
| 7 | Registro de eventos (logs) | **nestjs-pino** | Trae lo que Cloud Logging necesita y oculta datos personales |
| 8 | Estado en memoria | Permitido solo para protecciones efímeras, con una instancia | Resuelve la «contradicción» con ADR-8 |
| 9 | Estructura | Monolito modular con la carpeta propuesta | Una carpeta por funcionalidad |
| 10 | Cuándo usar «hexagonal» | Regla H1–H4, por operación | Capas solo donde de verdad hacen falta |
| 11 | Pruebas con base de datos | `docker compose` en local y _service container_ en CI | Un solo camino de código |
| 12 | Backlog | Reordenado: despliegue temprano, rama 6 dividida, bandeja de mensajes nueva | Se descubren problemas de despliegue antes |
| 13 | Modelo de datos | 31 respuestas; pasa a **15 tablas** | Faltaban campos que pide el diseño |
| 14 | Conservación de mensajes 👤 | **12 meses** | Datos personales con plazo |
| 15 | CV público 👤 | **Sí, versión sin teléfono**, como archivo del sitio | Sin datos privados |

---

## 2. Respuestas a los hallazgos del resumen ejecutivo (§0 y §1 del agente)

### 2.1 Zod en lugar de class-validator

- **Qué preguntaba:** el manual decía `class-validator`; el agente propone Zod 4 porque Nest 12 admite «Standard Schema» y porque `class-validator` pesaría en el navegador.
- **En sencillo:** el formulario de contacto se valida en dos sitios: en la web (para avisar al visitante al instante) y en la API (la comprobación que de verdad protege). Con `class-validator` habría que escribir las reglas dos veces y cargar en la web una librería pensada para el servidor. Con Zod, la regla se escribe una vez en `packages/shared`.
- **Decisión:** **Zod 4**, con `z.strictObject` (rechaza campos que no se esperan) y `max()` en todo texto.
- **Los esquemas devuelven códigos, no frases.** Por ejemplo `EMAIL_INVALID`; un archivo `messages/es.ts` lo traduce a «Escribe un correo válido». Así la API no devuelve texto para el visitante, como pide la regla 9, y desaparece la excepción de «mensajes ya en español».
- **Riesgo y control:** la generación automática de la documentación de la API (OpenAPI) con Zod es reciente y el agente solo la vio en un espejo de las notas de versión. Se añade una prueba que comprueba que el `openapi.json` incluye el cuerpo del formulario. Si falla, se reevalúa.
- **Cambia en el manual:** §7.5 («class-validator con whitelist») pasa a «Zod con esquemas estrictos». Queda un ADR nuevo (ADR-009).

### 2.2 Prisma fijado en 7.10.1

- **En sencillo:** en npm, la etiqueta «latest» de Prisma apunta hoy a una versión de pruebas de la 8. Si alguien escribe `pnpm add prisma` sin número, se instala esa. Prisma 7 y las guías de Nest están pensadas para la 7.
- **Decisión:** versiones **exactas** (sin `^`) para `prisma`, `@prisma/client` y `@prisma/adapter-pg`, todas 7.10.1. Lo mismo para `@nestjs/*` y `zod`. Dependabot o Renovate propondrán actualizaciones, agrupadas en un solo PR.
- **El nombre del archivo de configuración** (`prisma.config.ts` o `prisma7.config.ts`) no está claro entre las fuentes. Se usa `prisma.config.ts` y se comprueba al instalar; si no lo reconoce, se prueba el otro y se anota.

### 2.3 Neon: dos direcciones de conexión

- **En sencillo:** para consultar la base en el día a día se usa la dirección _pooled_ (`DATABASE_URL`). Para migrar hace falta la directa (`DATABASE_URL_UNPOOLED`), porque la _pooled_ produce el error «prepared statement already exists».
- **Decisión:** las dos variables existen desde el principio. Las migraciones corren **antes del despliegue**, como un paso aparte del pipeline (`migrate deploy`), nunca al arrancar el contenedor, y nunca se usa `migrate dev` ni `db push` contra Neon. Las pruebas jamás tocan la base de Neon.
- **Seguridad:** ambas direcciones van a Secret Manager; en `.env.example` solo van valores de ejemplo.

### 2.4 Login con GitHub: adaptador propio

- **En sencillo:** necesitamos que solo tú puedas entrar al panel, con tu cuenta de GitHub. Las librerías más conocidas están deprecadas (Arctic desde julio de 2026) o llevan seis años sin cambios (`passport-github2`). Lo que hay que hacer son pocos pasos bien definidos: redirigir a GitHub con un código de seguridad (`state` y PKCE), recibir el permiso y comprobar que la cuenta es la tuya.
- **Decisión:** un **adaptador propio** detrás de una «interfaz» (`GithubOAuthClient`), así se puede reemplazar por otro día.
  - Se piden los permisos mínimos y el token de GitHub se descarta tras leer tu usuario.
  - La comprobación compara el `login` **y** el `id` numérico de tu cuenta con la lista de permitidos.
- **Por qué no es temerario:** el código es pequeño, y es justo donde Claude Code debe ser más cuidadoso. Condiciones obligatorias: pruebas escritas primero que cubran un `state` falso, un PKCE incorrecto, una cuenta que no es la tuya y un token inválido; **revisión de seguridad con el modelo más capaz** antes de fusionar; y contraste con el OWASP API Security Top 10 y los capítulos de OAuth y sesión de ASVS 5.0.
- **ADR nuevo:** ADR-015.

### 2.5 Límite de peticiones detrás de un proxy

- **En sencillo:** para limitar los intentos por visitante, la API necesita saber la IP real. Detrás de Google (y de Cloudflare) llega en una cabecera que el visitante puede falsificar si leemos la entrada equivocada. El ejemplo oficial de Nest lee justamente la entrada falsificable.
- **Decisión:** `trust proxy = 1` y usar `req.ip`, **no** `req.ips[0]`. Se comprueba en Cloud Run real durante el despliegue temprano (rama 1b), con una prueba manual documentada: enviar `curl -H 'X-Forwarded-For: 1.2.3.4'` y verificar que no cambia el contador.
- **Con Cloudflare por delante** (decisión 2.6) hay un salto más. Propuesta a validar en la rama 1b: el reenvío de Cloudflare añade la IP real y una clave secreta compartida, y la API **solo confía en esa IP si la clave es correcta**. Se documenta en ADR-011.

### 2.6 Dominio de la API y cookie de sesión 👤

- **El riesgo (bloqueaba la rama 5):** si el panel está en `tudominio.dev` y la API en `algo.run.app`, la cookie de sesión es «de terceros». Muchos navegadores la bloquean, y para que funcione habría que debilitar la protección contra CSRF.
- **Tu decisión:** **mismo dominio a través de Cloudflare.** El navegador solo habla con `tudominio.dev`; Cloudflare reenvía las rutas `/api/*` a Cloud Run. Para el navegador es un solo origen: no hay CORS ni cookie de terceros, y la cookie puede usar la protección más estricta (`SameSite=Strict`, prefijo `__Host-`).
- **Plan B:** si la prueba de la rama 1b no funciona (latencia, IP o complejidad), se usa `api.tudominio.dev` con la «asignación de dominio» de Cloud Run. Google la marca como **Preview y no recomendada para producción**, por eso es la reserva y no la primera opción. El balanceador de carga queda descartado por coste.
- **Criterios para dar por buena la opción principal** (se prueban en 1b): una petición de la web llega a la API; la cookie se guarda y se envía; la IP real llega bien; el coste sigue en cero; y las peticiones por el reenvío caben en el límite gratuito de Cloudflare (100 000 al día para Workers).
- **ADR nuevo:** ADR-011.

### 2.7 Registro de eventos (logs) con pino

- **En sencillo:** el registro integrado de Nest no marca la gravedad como la entiende Cloud Logging, no añade un identificador por petición y no oculta datos personales.
- **Decisión:** `nestjs-pino`, con nivel `severity` en mayúsculas, identificador de petición (el de Google si existe, si no uno nuevo), el campo de traza de Cloud Run, y **ocultación** de cookie, `authorization` y campos personales del formulario. Además, **no se registran cuerpos de petición**. ADR-014.

### 2.8 «Sin estado» frente al límite en memoria

- **La duda:** el manual decía «sin estado en memoria» y el ADR-8 permite un contador en memoria.
- **Respuesta:** no se contradicen. «Sin estado» significa que ningún dato **importante** (sesiones, contenido) vive en el proceso. Los contadores del límite son descartables: si se pierden al reiniciar, solo se regala una ventana de peticiones. Con una única instancia, además, no hay nada que compartir.
- **Se adopta la redacción propuesta por el agente** para el manual §7.5:

> «La API no guarda en memoria del proceso ningún estado de negocio ni de sesión: la sesión viaja en una cookie firmada y los datos están en PostgreSQL. Se permite únicamente estado **efímero de protección** (contadores del limitador y, si aplica, el antirrebote de publicación), cuya pérdida no afecta a la corrección; es válido mientras `max-instances = 1` (ADR-008). Si se escala a más de una instancia, ese estado pasa a un almacén compartido o a la base de datos, y se revisa el ADR.»

- **Antirrebote de «Publicar»:** se guarda en la base de datos (tabla `publish_event`, ver sección 4), no en memoria, porque protege un recurso escaso (los 500 builds al mes) y sirve también para mostrar «última publicación» en el panel.

---

## 3. Estructura, patrones y reglas (secciones A, B, C y D del agente)

### 3.1 Estructura de carpetas (A)

- **Decisión:** se aprueba la estructura propuesta, **con ESM y NodeNext en todo el monorepo** (ADR-010). La carpeta `apps/api` queda con `prisma/`, `src/config`, `src/common`, `src/infrastructure/prisma` y `src/modules/*`; `packages/shared` queda con un archivo por recurso, sin archivo «barril» (`index.ts`) para evitar conflictos entre ramas.
- **Pruebas:** unitarias junto al código (`*.spec.ts`), de integración como `*.int-spec.ts`, de extremo a extremo en `test/e2e`. Los dobles y las fábricas de datos viven en `test/support` y `test/factories`, fuera de `src`.
- **Prohibición mecánica:** el linter impide leer `process.env` fuera de `src/config` y limita qué puede importar `domain/` y `application/` (D14).
- **Una duda del agente, resuelta:** `@nestjs/common` **sí** se permite dentro de `application/` solo para `@Injectable` e `@Inject`, porque son marcas de inyección y no lógica del framework. Nada más de Nest.

### 3.2 Patrones (B)

- **Decisión:** se aprueban los patrones adoptados y, sobre todo, la lista de **descartados** (CQRS, event sourcing, DDD completo, repositorio genérico, Redis, GraphQL, Passport y JWT). Para un proyecto de una sola persona, lo que no se añade es tan importante como lo que sí.
- **Sobre estrategias de desarrollo local** (`ConsoleNotifier`, `AlwaysPassCaptcha`): solo cuando `NODE_ENV` no es producción, y la configuración **falla al arrancar en producción** si faltan las claves reales. Así es imposible desplegar por error con el captcha apagado.

### 3.3 Cuándo usar «hexagonal ligera» y cuándo «CRUD plano» (C)

- **Decisión:** se aprueba el checklist H1–H4, aplicado **por operación** y no por módulo. En resumen: si la operación llama a un servicio externo (H1), coordina dos o más efectos con orden importante (H2), tiene una regla de negocio que no es de forma (H3) o depende del reloj o del azar (H4), se crea solo lo que esa regla activa. Si todo es «no», es CRUD plano y **no se simula Prisma**: se prueba con una base de datos real.
- **Resultado por módulo:** `health`, `content-read` y `admin-content` son CRUD plano; `contact`, `auth` y `publish` son hexagonal ligera; la bandeja de mensajes es CRUD plano, con una función pura de transición de estado si se confirman reglas.
- **Para tu revisión:** si una carpeta `domain/` o `application/` aparece sin una regla H que la justifique, se rechaza como «capa por si acaso». Esto va escrito en el manual §7.2.

### 3.4 Reglas adicionales (D1–D19)

- **Decisión:** se aprueban las 19 reglas. Las que más importan, dichas en sencillo:
  - **D1** versiones exactas; **D2** ESM y Node 22;
  - **D3** esquemas con códigos y no texto; **D4** `strictObject` y máximos en todo; **D5** límite de tamaño del cuerpo (16 kB);
  - **D6** tiempo máximo y reintentos limitados en toda llamada a un tercero;
  - **D7–D9** el panel exige sesión por defecto («prohibido salvo permiso explícito»), comprobación de origen y una prueba que recorre todas las rutas y exige 401 sin sesión;
  - **D10** el contrato `openapi.json` se guarda en el repositorio y el CI falla si cambia sin aviso;
  - **D12** listados paginados (máximo 50); **D13** no se registran cuerpos de petición;
  - **D18** las migraciones son un paso aparte antes de desplegar; **D19** el build del sitio reintenta la lectura y **nunca publica con datos vacíos**.
- **D16 (Swagger):** se muestra solo fuera de producción. El repositorio es público, pero la documentación de la API visible en producción amplía lo que ve un atacante sin aportar nada a un visitante.
- **D11 (contar consultas):** se intenta; el agente no confirmó cómo medirlas con Prisma 7. Si no es viable, se sustituye por una revisión manual del `include`/`select` en el PR y se anota la decisión.

### 3.5 Protección de la sesión del panel (CSRF y revocación)

- **Qué es el CSRF, en sencillo:** otra página maliciosa intenta que tu navegador envíe una orden a tu panel mientras tienes la sesión abierta.
- **Decisión:** tres defensas juntas. (1) Cookie `__Host-`, `Secure`, `HttpOnly` y `SameSite=Strict`; la cookie de la sesión se emite **en** el retorno de GitHub, y la del `state`/PKCE puede ser `Lax`. (2) Guard de origen: toda orden que cambia datos exige que el origen sea el del panel. (3) Una cabecera obligatoria en las llamadas del panel, que obliga al navegador a una comprobación previa.
- **Revocación sin estado:** la sesión caduca a las **8 horas** (límite absoluto) y se renueva solo por actividad. Si sospechas que robaron tu sesión, rotar `SESSION_SECRET` en Secret Manager cierra **todas** las sesiones. Se documenta en ADR-012. Con un solo administrador es suficiente; un registro de sesiones en base de datos queda como mejora futura si se necesitara.

### 3.6 Formato de errores y validación

- **Decisión (ADR-013):** todas las respuestas de error usan el formato estándar `application/problem+json`, con un `code` estable en inglés y un `traceId`. Los errores de validación devuelven `errors[]` con `pointer` y `code`. **400** para JSON mal formado y **422** para datos bien formados pero inválidos. Nunca se devuelven trazas ni detalles internos; el detalle va al log.

### 3.7 Pruebas con base de datos

- **Decisión (ADR-018):** `docker compose` en local y un _service container_ de PostgreSQL en CI. Una sola ruta de código, y la dirección de la base viene siempre del entorno. Testcontainers queda como alternativa si algún día se quiere ejecutar todo con un solo comando.
- **Aislamiento:** `TRUNCATE ... RESTART IDENTITY CASCADE` antes de cada prueba y los archivos de integración sin ejecutarse en paralelo.
- **Cobertura:** umbrales por carpeta (90 % en `domain/` y `application/`, 80 % global). Se documenta en `vitest.config.ts` que los archivos del 90 % también cuentan para el 80 %.
- **Decoradores bajo Vitest:** la inyección de dependencias por tipo de Nest necesita una herramienta (`unplugin-swc`) que genere cierta información que Vitest por sí solo no genera. La primera prueba del esqueleto debe **demostrar que funciona** (falla antes de configurarlo y pasa después). Si el esqueleto generado ya lo resuelve, se anota.

---

## 4. Modelo de datos (sección F): las 31 preguntas

La regla general que se aplica: **si el diseño lo muestra o el requisito lo pide, se añade; si es «por si acaso», no.**

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | `reference.linkedin_url` | **Sí**, texto, validado contra `linkedin.com`. Puede estar vacío mientras la referencia sea borrador; para publicar es obligatorio (ver 4) |
| 2 | `reference.display_order` | **Sí** |
| 3 | «Destacada» | **No.** Se muestran todas las publicadas, ordenadas por `display_order`. Si más adelante son muchas, se añade |
| 4 | `published` con `authorized = false` | **Imposible**: `CHECK (NOT published OR (authorized AND linkedin_url IS NOT NULL))` |
| 5 | Campos de `profile` | **Sí, todos**: resumen largo, ubicación, correo público, `github_url`, `linkedin_url` y `cv_url` |
| 6 | Propuesta de valor, datos destacados y tarjetas de «Sobre mí» | Una columna `value_proposition` en `profile` y una tabla hija **`profile_highlight`** (`kind`: `stat` o `about_card`, `icon_key`, `title`, `text`, `display_order`) |
| 7 | `profile` de una sola fila | `id` fijo igual a 1, con `CHECK (id = 1)` |
| 8 | Borrador del perfil | **No.** Se publica con el siguiente build, como las habilidades y tecnologías |
| 9 | `project.description` | **No se añade.** Con `summary` (tarjeta) y `problem`/`solution`/`result` (ficha) basta; se corrige el inventario |
| 10 | `project.featured` | **Sí** (3 o 4 destacados en el inicio) |
| 11 | Mini-diagrama de flujo | Tabla hija **`project_flow_step`** (`project_id`, `label`, `icon_key`, `display_order`). El texto para lectores de pantalla se genera uniendo las etiquetas; sin columna extra |
| 12 | `code_access` y `repo_url` | `CHECK` doble: un proyecto privado no puede tener `repo_url`, y un proyecto público **publicado** debe tenerlo. Así el del SENA puede quedar como borrador mientras falta su enlace |
| 13 | Validar el slug | **En ambos lados**: esquema y `CHECK` con la expresión `^[a-z0-9]+(-[a-z0-9]+)*$` |
| 14 | `experience.description` | **Sí**, opcional |
| 15 | `end_date` nulo = cargo actual | **Confirmado**, más `CHECK (end_date IS NULL OR end_date >= start_date)` |
| 16 | `experience_item.kind` | Dos valores: **`metric`** y **`responsibility`** (los logros se tratan como responsabilidades). Columnas `text` (obligatoria) y `value` (solo para `metric`); un `CHECK` fuerza que `value` exista si y solo si es `metric` |
| 17 | `published` en experiencia | **Sí** |
| 18 | `technology.category` frente a `skill_group` | **Se elimina `technology.category`.** Manda `skill_group`, que es lo que ve el visitante |
| 19 | `skill.display_order` | **Sí** |
| 20 | Validar `icon_key` | Contra una **lista cerrada en `packages/shared`**, no en la base de datos |
| 21 | `contact_message.subject` | **No**; el formulario diseñado no lo tiene |
| 22 | Estado del aviso | **Sí**: `notification_status` (`pending`, `sent`, `failed`) y `notified_at`. El reintento es manual, con un botón «reenviar aviso» en la bandeja; sin tareas en segundo plano |
| 23 | `read_at` y `archived_at` | **No**; basta con `status` (`new`, `read`, `archived`) y `updated_at` |
| 24 | Conservación de mensajes 👤 | **12 meses.** Al inicio se borran a mano desde la bandeja; el borrado automático queda como mejora posterior |
| 25 | `created_at` y `updated_at` | **En todas las tablas** (útil además para el `lastmod` del sitemap) |
| 26 | UUID | Lo genera **la base de datos** con `gen_random_uuid()` |
| 27 | `display_order` único | **No único.** Reordenar reescribe 1..n en una transacción |
| 28 | `ON DELETE` | **Confirmado**: cascada en hijas y tablas puente, y `RESTRICT` al borrar una tecnología en uso |
| 29 | Registro de publicaciones | **Sí**: tabla **`publish_event`** (`id`, `requested_at`, `trigger_ok`). Sirve para el antirrebote y para «última publicación» |
| 30 | Semántica de borrador | **Se acepta el indicador por fila.** Editar algo ya publicado sale en el siguiente build, sea cual sea su origen. No se hacen «versiones publicadas» separadas |
| 31 | Índices | Los previstos, más `experience(published, start_date DESC)`, `skill(group_id, display_order)` e índice en toda clave foránea |

**Tablas resultantes (15):** `profile`, `profile_highlight`, `project`, `project_decision`, `project_flow_step`, `technology`, `project_technology`, `experience`, `experience_item`, `experience_technology`, `skill_group`, `skill`, `reference`, `contact_message`, `publish_event`.

**Tareas que genera:** el diagrama `modelo-relacional-elegido.png` se rehace con las 15 tablas, y el documento de arquitectura (§3) se actualiza. Lo hace Claude Code en la rama de la base de datos; el documento sirve de especificación.

---

## 5. Backlog definitivo (sección E)

**Decisión:** se aprueban todos los cambios propuestos. Los más importantes:
- **Despliegue temprano (1b):** una versión mínima de la API ya en Cloud Run justo después de la 1. Es donde se prueban la IP real, el dominio con Cloudflare, la cookie, los arranques en frío y la autenticación con Google. Mejor descubrir un problema aquí que en la rama 8.
- **La rama 6 se divide** en piezas pequeñas (tecnologías, proyectos, experiencia, habilidades, referencias y perfil), porque tocan recursos distintos.
- **Bandeja de mensajes** como rama propia (RF-14).
- **Antirrebote de publicación** incluido en la rama de publicar.

| Orden | Rama | Depende de | Notas |
|---|---|---|---|
| 0 | `chore/monorepo-skeleton` | — | ESM, versiones exactas, Vitest con tres proyectos, prueba que demuestra la inyección por tipo |
| 1 | `feat/api-foundation` | 0 | pino, validación, errores estándar, límite, OpenAPI y prueba del contrato |
| 1b | `ci/deploy-api` | 1 | Despliegue mínimo y prueba del dominio único con Cloudflare |
| 2 | `feat/db-schema` | 1 (en paralelo con 1b) | Las 15 tablas, restricciones, índices, datos iniciales y las dos URL de Neon |
| 3 | `feat/content-read` | 2 | Solo lo publicado; prueba de número de consultas si es viable |
| 4 | `feat/contact-messages` | 2 | Guarda y luego avisa; Turnstile y Resend tras puertos |
| 5 | `feat/admin-auth` | 2 y 1b | Entrada con GitHub, sesión, guard global, guard de origen, `logout` y `me` |
| 6a | `feat/admin-technologies` | 5 | Catálogo que usan las demás |
| 6b / 6c / 6d | `feat/admin-projects`, `feat/admin-experience`, `feat/admin-skills` | 6a | En paralelo |
| 6e / 6f / 7 | `feat/admin-references`, `feat/admin-profile`, `feat/contact-inbox` | 5 | En paralelo |
| 8 | `feat/publish-workflow` | 5 y `publish_event` | Antirrebote en base de datos |
| 9 | `ci/db-backup` | 2 y 1b | Volcado semanal |

**Máximo 3 agentes a la vez.** Las ramas que tocan `app.module.ts` o `codes.ts` las integra el orquestador una tras otra.

**Fuera del backend, pero necesario:** el workflow del sitio que lee el contenido y escucha el aviso de publicación; y dónde viven el CV y la foto. **Decisión 👤:** ambos son **archivos estáticos del sitio** (en `apps/web/public`), no se suben desde el panel. `profile.photo_url` y `profile.cv_url` guardan la ruta. Se evita así tener que gestionar almacenamiento de archivos y su coste. Cambiar el CV implica un commit.

---

## 6. Los riesgos del agente (sección G), uno por uno

| # | Riesgo | Respuesta |
|---|---|---|
| G1 | Dominio y cookie | Decidido en 2.6 |
| G2 | Formato de `X-Forwarded-For` | 2.5 y la prueba manual en 1b |
| G3 | Revocar una sesión sin estado | 3.5: caducidad de 8 h y rotación del secreto |
| G4 | Prisma y el nombre del archivo | 2.2 |
| G5 | Nest 12 es reciente | Antes de añadir una librería, se comprueba que declara soporte para Nest 12 |
| G6 | OpenAPI con Zod | Prueba del contrato en la rama 1 |
| G7 | Decoradores bajo Vitest | Prueba inicial en la rama 0 |
| G8 | Arranque en frío al hacer el build | D19: reintentos y error explícito, nunca publicar vacío |
| G9 | Límite en memoria | Aceptado y escrito en ADR-008 |
| G10 | Cobertura de globs | Se documenta en `vitest.config.ts` |
| G11 | 400 frente a 422 | 3.6 |
| G12 | Turnstile y privacidad (RNF-14) | **Sigue pendiente**: antes de activarlo, el agente de seguridad revisa qué datos recoge. Si no encaja, se usa el adaptador `NoopCaptcha` y se mantienen el campo trampa y el límite |
| G13 | Rutas del manual desactualizadas | Ver sección 7 |
| G14 | Numeración de ADR | Ver abajo |
| G15 | Permisos del token para publicar | Empezar con un token de acceso **de grano fino**, limitado a este repositorio y con el menor permiso que acepte GitHub (probablemente «Contents: write»; hay que comprobarlo al crearlo). Anotar la fecha de caducidad en el calendario. Si el permiso resulta demasiado amplio, se evalúa una GitHub App |

### Numeración de ADR (G14)

La numeración de los ADR **es independiente** de la tabla de decisiones del documento de arquitectura. Quedan así:

| ADR | Tema |
|---|---|
| 001–007 | Los de la lista original (monorepo, NestJS, contenido independiente, tema, PostgreSQL, Cloud Run, entrar con GitHub) |
| **008** | Estado en memoria: solo protecciones efímeras, con una instancia (límite de peticiones) |
| 009 | Validación con Zod y «Standard Schema» |
| 010 | ESM y NodeNext en todo el monorepo |
| 011 | Dominio único de la API y cookie de sesión (Cloudflare) |
| 012 | Sesión firmada, caducidad y revocación |
| 013 | Formato de errores (RFC 9457; 400 y 422) |
| 014 | Registro de eventos con pino |
| 015 | Adaptador propio de OAuth con GitHub |
| 016 | `/health` sin base de datos y monitoreo |
| 017 | Regla H1–H4 (hexagonal ligera o CRUD plano) |
| 018 | Estrategia de pruebas con base de datos |
| 019 | Prisma 7 fijo y dos URL de Neon |

El manual cita «ADR-008» para «API sin estado» (correcto) y para «`/health` sin base de datos» (debe ser **ADR-016**).

---

## 7. Cambios que Claude Code debe hacer en los documentos

1. **Manual §7.5:** sustituir `class-validator` por Zod (2.1); incluir la redacción nueva de «sin estado» (2.8); incluir las dos URL de Neon (2.3); corregir la cita de `/health` a ADR-016; añadir que `@nestjs/common` se permite en `application/` solo para inyección (3.1).
2. **Manual §7.4:** quitar la excepción de «mensajes ya en español en `packages/shared`»: los esquemas emiten códigos y `messages/es.ts` traduce (2.1).
3. **Manual §12 (backlog):** reemplazar por la tabla de la sección 5.
4. **Manual §2 (rutas de los documentos):** corregir según el punto de abajo (G13).
5. **Documento de arquitectura (`05`):** actualizar el modelo de datos a 15 tablas y la numeración de ADR; anotar el dominio único de la API; anotar la decisión del CV y la foto como archivos estáticos.
6. **ADR:** redactar los 19, cada uno corto, en español, con contexto, decisión, alternativas y cuándo revisarla.
7. **`CLAUDE.md`:** sin cambios, salvo corregir rutas si se mueven documentos.

---

## 8. Lo que tienes que hacer tú

1. **Documentos movidos (G13).** El agente dice que los archivos se movieron a `docs/discovery/` y que `03-information-architecture.md` y la carpeta `profile/` aparecen borrados en tu copia de trabajo. Esos dos son necesarios (inventario de contenido y borrador del contenido). Revisa `git status`. Si los moviste tú a propósito, dime la ruta final y se actualiza el manual; si fue un accidente, restáuralos con `git restore`.
2. **Preparar una versión del CV sin teléfono** (cuando llegue el momento de la web).
3. **Dar el visto bueno a este documento.** Con tu «ok», Claude Code puede pasar a la Fase 1.

---

## 9. Lo que sigue sin verificar

- **Cómo se genera el contrato OpenAPI con Zod** (solo visto en un espejo de notas de versión): lo cubre una prueba.
- **Permisos exactos del token de publicación:** se comprueba al crearlo.
- **Nombre del archivo de configuración de Prisma 7:** se comprueba al instalar.
- **Contar consultas con Prisma 7:** puede no ser viable.
- **Reenvío por Cloudflare hacia Cloud Run:** es lo que decidiste, pero sin probar; la rama 1b lo valida con criterios concretos y existe un plan B.
- **Turnstile y privacidad (RNF-14):** pendiente de revisión.
- **Límites gratuitos de Cloudflare, Neon y Google:** se vuelven a verificar al crear cada cuenta.
