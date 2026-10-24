# Agentes y modelos

**Fecha:** 2026-10-24 · **Versión de Claude Code:** 2.1.310 · **Responsable:** orquestador (sesión principal), según el manual, sección 4.

## 1. Cómo se resuelve el modelo de un agente

Según la documentación vigente de subagentes (code.claude.com/docs/en/sub-agents, consultada el 2026-10-24), el orden es:

1. Parámetro `model` de la invocación.
2. Campo `model` del frontmatter del agente (`inherit` = modelo de la sesión).
3. Variable `CLAUDE_CODE_SUBAGENT_MODEL`.
4. Modelo de la sesión principal.

`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` hace que se ignore el campo `model` de todos los agentes.

**Comprobación:** ni `CLAUDE_CODE_SUBAGENT_MODEL` ni `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` están definidas en el entorno, en `~/.claude/settings.json` ni en `.claude/settings.json`. La elección del frontmatter es la efectiva. Regla del orquestador: **no pasar el parámetro `model` al invocar los agentes del proyecto**, para no pisar esta tabla.

**Precedencia por nombre:** si un agente de proyecto (`.claude/agents/`) y uno de usuario (`~/.claude/agents/`) comparten nombre, gana el del proyecto. Los agentes nuevos usan nombres distintos para no ocultar los del usuario.

## 2. Agentes del proyecto (`.claude/agents/`)

Creados por el orquestador: no hay un agente configurador habilitado (el `agent-creator` del plugin `plugin-dev` está en el catálogo del marketplace, pero el plugin no está instalado y solo genera agentes de plugin).

| Agente | Rol | Modelo | Herramientas | Skills precargadas | Motivo del modelo |
|---|---|---|---|---|---|
| `nestjs-developer` | Implementación (verde) y refactor | `opus` | Read, Write, Edit, Glob, Grep, Bash | test-driven-development, prisma-client-api | Decisión de Anderson (2026-10-24): implementación en el más capaz |
| `tdd-test-engineer` | Pruebas en rojo, caracterización, cobertura | `sonnet` | Read, Write, Edit, Glob, Grep, Bash | test-driven-development, vitest | Pruebas: equilibrio calidad/coste (manual 4.3) |
| `prisma-db-engineer` | Esquema, migraciones, datos iniciales, adaptadores Prisma | `sonnet` | Read, Write, Edit, Glob, Grep, Bash | postgresql-table-design, prisma-cli, prisma-client-api | Base de datos: equilibrio calidad/coste |
| `devops-engineer` | pnpm, Docker, compose, GitHub Actions, Cloud Run | `sonnet` | Read, Write, Edit, Glob, Grep, Bash | multi-stage-dockerfile (+ cloud-run-basics al llegar a `ci/deploy-api`) | DevOps: equilibrio calidad/coste |
| `api-security-auditor` | Revisión de seguridad (OWASP API, ASVS) | `opus` | Read, Glob, Grep, Bash (sin edición) | security-and-hardening, security-review | Un fallo de seguridad se propaga a todo |
| `nest-code-reviewer` | Revisión de código | `opus` | Read, Glob, Grep, Bash (sin edición) | — | Revisión: el error se propaga |
| `tdd-auditor` | Auditoría del historial rojo → verde → refactor | `opus` | Read, Glob, Grep, Bash (sin edición) | test-driven-development | Auditoría TDD en el más capaz (manual 4.3) |
| `backend-architect` | Decisiones y ADR | `opus` | Read, Write, Edit, Glob, Grep, WebFetch, WebSearch | — | Arquitectura en el más capaz |
| `docs-writer` | README, guías, descripciones de PR | `haiku` | Read, Write, Edit, Glob, Grep | — | Tarea mecánica a partir de hechos dados |

Notas de diseño:

- **Ningún agente tiene la herramienta `Agent`**, y además `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` impide el anidamiento.
- Los tres revisores no pueden editar: informan y el orquestador devuelve la tarea al implementador.
- **No se usa `isolation: worktree` en el frontmatter**: esa opción crea un árbol temporal desde `main` en cada invocación, y el flujo rojo → verde → refactor necesita que los agentes trabajen en secuencia sobre la misma rama. El orquestador crea el árbol `../wt-<rama>` (manual 6) y pasa su ruta en el encargo.
- El refactor lo hace `nestjs-developer` en una invocación separada, porque conoce las convenciones del proyecto. El `code-refactorer` de usuario es genérico.

## 3. Agentes de usuario (`~/.claude/agents/`): 60 agentes

Ninguno define `tools` (heredan todas) ni `skills`. No se modifican sin permiso de Anderson.

**Hallazgo:** los agentes de usuario con método detallado (`code-reviewer`, `test-generator`, `security-scanner`, `database-expert`, `system-architect`, `multi-agent-coordinator`, `laravel-specialist`) tienen sus listas de comprobación **fijadas a Laravel 12, PHP, Pest y Eloquent**. Usados en este repositorio darían instrucciones incorrectas (Pest, `php artisan`, Form Requests). El resto tiene un cuerpo genérico de 27 líneas sin método.

| Agente | Descripción (resumen) | Modelo | Decisión para este proyecto |
|---|---|---|---|
| accessibility-pro | Auditoría WCAG | sonnet | Conservar para el frontend (RNF-03); fuera del backend |
| ai-integration-expert | Funciones con LLM | sonnet | No aplica |
| analytics-engineer | Analítica de producto | sonnet | No aplica (RF-16 es post-MVP) |
| api-builder | Diseño de API HTTP | sonnet | Descartar aquí: genérico; lo cubren `backend-architect` y `nestjs-developer` |
| automation-builder | Tareas programadas simples | sonnet | No aplica |
| code-refactorer | Refactor con pruebas en verde | opus | Descartar aquí: genérico; refactor en `nestjs-developer` |
| code-reviewer | Revisión de código | opus | Sustituido por `nest-code-reviewer` (el de usuario es de Laravel) |
| community-features | Foros y comentarios | sonnet | No aplica |
| compliance-expert | Privacidad (GDPR) | opus | Consulta puntual posible (RNF-14, Turnstile); no en el flujo |
| content-writer | Microcopy de interfaz | haiku | Conservar para el frontend (mensajes en español) |
| cost-optimizer | Reducir factura cloud | sonnet | No aplica de momento |
| csharp-developer | .NET | sonnet | No aplica |
| data-engineer | ETL | sonnet | No aplica |
| database-expert | PostgreSQL | sonnet | Sustituido por `prisma-db-engineer` (el de usuario es de Laravel) |
| debugger | Causa raíz de fallos | opus | Conservar como apoyo ante fallos persistentes |
| deployment-wizard | CI/CD | sonnet | Sustituido por `devops-engineer` (genérico) |
| design-system-builder | Tokens y componentes | sonnet | Conservar para el frontend |
| django-developer | Django | sonnet | No aplica |
| docker-expert | Docker | sonnet | Sustituido por `devops-engineer` (genérico) |
| email-automator | Campañas de correo | sonnet | No aplica (el correo es un aviso transaccional) |
| go-expert | Go | sonnet | No aplica |
| growth-engineer | Experimentos de crecimiento | sonnet | No aplica |
| infrastructure-builder | Arquitectura cloud | sonnet | No aplica (la decisión está tomada) |
| innovation-lab | Prototipos | sonnet | No aplica |
| integration-master | Clientes de terceros, OAuth, webhooks | sonnet | Descartar aquí: genérico; cubierto por `nestjs-developer` |
| java-architect | Java | sonnet | No aplica |
| kubernetes-specialist | Kubernetes | sonnet | No aplica |
| landing-page-optimizer | Copys de conversión | haiku | No aplica |
| langchain-expert | LangChain | sonnet | No aplica |
| laravel-specialist | Laravel 12 | sonnet | No aplica |
| load-tester | Pruebas de carga | sonnet | No aplica en el MVP |
| market-analyst | Competencia | sonnet | No aplica |
| ml-engineer | Machine learning | sonnet | No aplica |
| mobile-optimizer | PWA y móvil | sonnet | Frontend, opcional |
| monitoring-expert | Sentry, métricas | sonnet | Posible en una rama futura de monitoreo (decisión 9) |
| multi-agent-coordinator | Coordinar subagentes | opus | No usar: el orquestador es la sesión principal y el anidamiento está desactivado |
| nextjs-expert | Next.js | sonnet | Conservar para el frontend |
| performance-engineer | Rendimiento | sonnet | No aplica en el MVP |
| playwright-expert | E2E en navegador | sonnet | Conservar para el E2E previo al despliegue (fase 5, sección 7) |
| product-strategist | Priorización | sonnet | No aplica |
| prompt-engineer | Prompts | sonnet | No aplica |
| python-pro | Python | sonnet | No aplica |
| react-specialist | React | sonnet | Conservar para el frontend |
| release-manager | Estrategia de versiones | sonnet | No aplica |
| revenue-optimizer | Pagos | sonnet | No aplica |
| rust-engineer | Rust | sonnet | No aplica |
| security-scanner | Seguridad | opus | Sustituido por `api-security-auditor` (el de usuario es de Laravel) |
| seo-master | SEO técnico | haiku | Conservar para el frontend (RNF-04) |
| spring-boot-engineer | Spring Boot | sonnet | No aplica |
| sre-engineer | SLO, incidentes | sonnet | No aplica |
| support-builder | Ayuda y FAQ | sonnet | No aplica |
| system-architect | Arquitectura | opus | Sustituido por `backend-architect` (el de usuario asume Laravel) |
| terraform-expert | Terraform | sonnet | No aplica (no hay IaC con Terraform decidida) |
| test-generator | Pruebas | sonnet | Sustituido por `tdd-test-engineer` (el de usuario es de Pest) |
| typescript-pro | TypeScript | sonnet | Descartar aquí: genérico, sin método |
| ui-polisher | Pulido visual | sonnet | Conservar para el frontend |
| user-researcher | Datos de usuarios | sonnet | No aplica |
| ux-optimizer | Flujos | sonnet | Frontend, opcional |
| vue-expert | Vue | sonnet | No aplica |
| workflow-orchestrator | Flujos DAG dentro de la app | sonnet | No aplica |

«Descartar» o «No aplica» significa que el orquestador no los usa en este repositorio; los ficheros no se tocan.

**Propuesta para Anderson (no aplicada):** añadir al principio de los agentes de usuario fijados a Laravel una línea «Si el repositorio no es Laravel, ignora la lista de comprobación específica», para que no contaminen otros proyectos. Requiere tu permiso.

## 4. Agentes de plugins

El marketplace `anthropics/claude-plugins-official` está descargado, pero **ningún plugin está habilitado** (`enabledPlugins` no aparece en la configuración), así que sus agentes no están disponibles. Relevantes si se habilitaran:

| Plugin | Agentes | Modelo | Valoración |
|---|---|---|---|
| pr-review-toolkit | code-reviewer, code-simplifier, comment-analyzer, pr-test-analyzer, silent-failure-hunter, type-design-analyzer | opus / inherit | `silent-failure-hunter` y `pr-test-analyzer` complementarían bien la revisión. Opcional; habilitarlo es decisión de Anderson |
| feature-dev | code-architect, code-explorer, code-reviewer | sonnet | Redundante con los agentes del proyecto |
| claude-security | orquestador de escaneo y verificadores | inherit (xhigh) | Solo como sesión principal (`claude --agent`), no como subagente. Útil para una auditoría completa antes del despliegue |
| plugin-dev | agent-creator, plugin-validator, skill-reviewer | sonnet / inherit | Orientado a plugins; no se usa |

## 5. Revisión

Revisar esta tabla si se alcanzan límites de uso o si la calidad de un agente decepciona. La implementación en `opus` no se cambia sin consultar a Anderson; si se agotan los límites, se le avisa.
