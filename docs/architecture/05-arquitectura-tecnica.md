# Fase 5: Arquitectura técnica y despliegue

**Estado:** decisiones tomadas con el usuario, una a una · **Fecha:** 2026-10-24
**Revisión de límites gratuitos:** 2026-10-24. Estos planes cambian con frecuencia; cada límite se vuelve a verificar en el panel del proveedor al crear la cuenta.

## 1. Resumen

El sitio público es estático y se genera con los datos de la API en cada publicación, así que sigue funcionando aunque la API esté dormida. La API (NestJS) solo se necesita para el formulario de contacto y el panel de administración. El gasto previsto es el dominio, unos 13 USD al año (confirmar el precio exacto en Cloudflare).

```
Lectura pública    Visitante ──▶ Sitio Next.js estático ──▶ Cloudflare

Escritura / panel  Formulario o panel ──▶ API NestJS (Cloud Run) ──▶ PostgreSQL (Neon)
                                                │
                                                └──▶ Correo de aviso (Resend)

Publicación        Panel: «Publicar» ──▶ API ──▶ GitHub Actions ──▶ build de Next.js
                   (lee el contenido de la API) ──▶ despliegue en Cloudflare

Entrega continua   Pull request ──▶ CI (lint, tipos, pruebas, seguridad, Lighthouse)
                   Merge en main ──▶ imagen Docker ──▶ Cloud Run  +  sitio ──▶ Cloudflare
```

## 2. Decisiones

| # | Tema | Decisión | Alternativas descartadas | Motivo principal |
|---|---|---|---|---|
| 1 | Frontend (hosting) | Cloudflare | GitHub Pages, Netlify, Vercel Hobby | Tráfico estático ilimitado, 500 builds al mes, sin tarjeta ni restricción comercial. Netlify pausa todos los sitios al agotar créditos; Vercel Hobby es solo no comercial |
| 2 | API (hosting) | Google Cloud Run | Render, Railway, dejarla para después | Ejecuta el contenedor Docker tal cual, escala a cero, 2 millones de peticiones gratis al mes. Render declara que el plan gratis no es para producción |
| 3 | Base de datos | PostgreSQL en Neon | Documentos (Firestore, Atlas), Supabase | Relaciones muchos a muchos (tecnologías), integridad, portabilidad y valor para el perfil. Supabase se pausa tras una semana de inactividad |
| 4 | Correo | Resend | Brevo, Gmail por SMTP | 100 correos al día gratis, SDK para TypeScript. Los mensajes se guardan siempre en la base antes de enviar |
| 5 | CI/CD | GitHub Actions para todo | Git de Cloudflare para el sitio, Azure DevOps | Gratis sin tope en repositorios públicos; el pipeline completo queda visible en el repositorio |
| 6 | Publicación del contenido | Publicar y reconstruir | Archivo JSON publicado por la API, consulta directa a la API | Mejor SEO y rendimiento, independencia del backend, y separación entre borrador y publicado |
| 7 | Framework | Next.js con exportación estática | React Router v7 con prerender, Astro | Mayor demanda laboral; Server Components se ejecutan durante el build |
| 8 | Dominio | `.dev` en Cloudflare Registrar | `.com` | Comunica perfil de desarrollador, HTTPS obligatorio, ocultación de datos personales incluida |
| 9 | Monitoreo | UptimeRobot, Sentry y Cloudflare Web Analytics | Solo disponibilidad y analítica | Tres capas independientes sin coste; la analítica no usa cookies |
| 10 | Acceso al panel | Entrar con GitHub, lista de permitidos | Correo y contraseña, enlace mágico | Sin contraseñas que guardar ni recuperación que construir; menor superficie de ataque |
| 11 | Secretos | Secret Manager de Google y secretos de GitHub | Variables de Cloud Run, SOPS | Estándar profesional, gratis hasta 6 versiones activas y 10 000 accesos al mes |
| 12 | Copias de seguridad | Volcado semanal a un bucket privado de Cloud Storage | Manual, ninguna | Neon gratis solo conserva 6 horas de historial |
| 13 | ORM | Prisma 7 | Drizzle, TypeORM | Esquema legible, cliente tipado, migraciones SQL versionadas |
| 14 | Anti-abuso del formulario | Campo trampa, límite de peticiones (`@nestjs/throttler`) y Cloudflare Turnstile | Solo las dos primeras | Defensa por capas |
| 15 | Entornos y Git | Local y producción; ramas cortas con pull request y `main` protegida | Añadir staging | Mantenible por una persona; reversión rápida con las revisiones de Cloud Run |

## 3. Cambios al modelo de datos

Diagramas: `img/modelo-relacional-elegido.png` (el elegido) e `img/modelo-documentos-descartado.png` (la alternativa descartada, referencia del ADR-005).

El modelo relacional de la fase de diseño pasa de 13 a **12 tablas**: sin contraseñas, no hace falta la tabla `admin_user`. La API acepta un único inicio de sesión de GitHub, indicado por una variable de entorno (`ADMIN_GITHUB_LOGIN`). Las demás tablas siguen igual: `profile`, `project`, `project_decision`, `technology`, `project_technology`, `experience`, `experience_item`, `experience_technology`, `skill_group`, `skill`, `reference` y `contact_message`.

## 4. Flujo de publicación

1. En el panel se edita contenido; cada elemento tiene el estado `published` (borrador o publicado).
2. Al pulsar **Publicar**, la API envía un evento `repository_dispatch` a GitHub, con un token guardado como secreto.
3. El workflow compila Next.js con `output: 'export'`; las páginas piden el contenido publicado a la API durante el build.
4. El sitio resultante se despliega en Cloudflare. El proceso tarda unos minutos.

Cada publicación consume un build de los 500 mensuales de Cloudflare Pages, si se usa ese producto. Cloudflare recomienda ahora Workers para proyectos nuevos; el método de despliegue exacto se confirma al implementarlo.

## 5. Región y costes

| Pieza | Coste previsto | Qué ocurre al superar el límite |
|---|---|---|
| Dominio `.dev` | Unos 13 USD al año | No aplica |
| Cloudflare (sitio, analítica, Turnstile) | 0 | Sin tope de tráfico estático |
| Cloud Run | 0 dentro de la cuota | **Único punto con riesgo de cobro**; exige cuenta de facturación con tarjeta |
| Neon | 0 | Suspende el cómputo o bloquea escrituras; no cobra |
| Resend | 0 | 100 correos al día |
| GitHub Actions | 0 | Sin tope en repositorios públicos |
| Secret Manager, Cloud Storage, Cloud Logging | 0 dentro de la cuota | Cloud Storage gratis solo en `us-central1`, `us-east1` y `us-west1` |
| UptimeRobot, Sentry | 0 | Sentry limita a 5 000 errores al mes |

La API y el bucket irán en `us-central1`, la región a la que se refieren las cifras de la capa gratuita de Cloud Run. La región de Neon se elige al crear el proyecto, lo más cercana posible.

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cobro inesperado en Google Cloud | Máximo de una instancia, límite de peticiones, alerta de presupuesto desde el primer día, revisión mensual de la factura |
| Cambio de condiciones de un plan gratuito | Docker y PostgreSQL estándar hacen portable la API y los datos. Plan B documentado: API en Render (sin tarjeta, con arranque lento), sitio en GitHub Pages o Netlify |
| Arranque en frío de la API (Cloud Run y Neon se suman) | El sitio público no depende de la API. El formulario muestra estado de envío y reintento |
| El monitoreo agota la cuota gratuita | Una revisión cada 5 minutos son unas 8 640 peticiones al mes (0,4 % de las 2 millones de Cloud Run). El riesgo está en el CPU y en Neon: si cada revisión arranca un contenedor frío (peor caso, cerca de la mitad de los 180 000 vCPU-segundos), o si toca la base de datos (Neon nunca se suspende y supera las 100 CU-horas gratuitas, suponiendo un mínimo de 0,25 CU por verificar). Mitigación: el `/health` de la API no accede a la base de datos; el monitor principal vigila el sitio público; se mide el consumo real durante el primer mes; alerta de presupuesto en Google Cloud |
| Pérdida de datos | Volcado semanal cifrado a un bucket privado; probar la restauración al menos una vez |
| Filtración de secretos | Secret Manager, ningún secreto en el repositorio, autenticación de GitHub Actions con Workload Identity Federation (sin archivos de llave) |
| Artefactos de GitHub Actions en un repositorio público | No guardar volcados como artefactos; todo va al bucket privado |
| Contador del límite de peticiones incorrecto detrás del proxy | Configurar la IP real del cliente al implementar el límite |
| Turnstile y privacidad (RNF-14) | Revisar cookies y datos que recoge antes de integrarlo; si no encaja, usar solo las dos primeras capas |
| Prisma: versión y generación del cliente | Fijar `prisma@7` y ejecutar `prisma generate` en el pipeline |
| Sentry: términos de uso y tarjeta no confirmados | Verificar al crear la cuenta |

## 7. Pipeline de CI/CD

- **En cada pull request:** linter, comprobación de tipos, pruebas unitarias y de integración (PostgreSQL en contenedor), auditoría de dependencias y Lighthouse.
- **Antes de desplegar:** pruebas E2E del flujo crítico con Playwright.
- **Al fusionar en `main`:** imagen Docker de la API a Cloud Run; sitio a Cloudflare.
- **Programado:** volcado semanal de la base de datos.
- **Reglas del repositorio:** `main` protegida, pull request obligatorio, commits convencionales.

## 8. ADR por redactar

1. Un monorepo en lugar de dos repositorios.
2. NestJS en lugar de Spring Boot.
3. Contenido público independiente del backend (publicar y reconstruir).
4. Tema claro y oscuro con tokens de diseño.
5. PostgreSQL en lugar de una base de documentos.
6. Cloud Run como hosting de la API.
7. Entrar con GitHub en lugar de contraseñas propias.
8. Límite de peticiones en memoria con una sola instancia (revisable si se escala).

## 9. Pendientes

- Verificar los límites de cada plan al crear cada cuenta y anotar la fecha.
- Confirmar en Cloudflare el precio exacto del `.dev` y que el nombre esté disponible.
- Revisar la política de cookies y datos de Turnstile (RNF-14) y los términos de Sentry.
- Elegir el método de despliegue en Cloudflare (Pages o Workers con activos estáticos).
- Actualizar el diagrama relacional a 12 tablas.
- Del contenido: enlaces del proyecto del SENA, datos de las tres referencias, color de error en tema oscuro.

## 10. Fuentes

- Cloudflare Pages: [temps.sh](https://temps.sh/blog/cloudflare-pages-free-tier-limits-2026) (tercero) · [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) · [Web Analytics](https://www.cloudflare.com/web-analytics/) · [Turnstile](https://developers.cloudflare.com/turnstile/plans/)
- Comparativa de hosting: [flaviocopes.com](https://flaviocopes.com/hosting-free-tiers/) (tercero, 16 de septiembre de 2026)
- [Netlify](https://netli.fyi/blog/netlify-free-plan-limits-2026) (tercero) · [Vercel Hobby](https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing) (tercero)
- [Render](https://render.com/docs/free) · [Cloud Run: precios](https://cloud.google.com/run/pricing) · [Capa gratuita de Google Cloud](https://docs.cloud.google.com/free/docs/free-cloud-features) · [Secret Manager](https://cloud.google.com/secret-manager/pricing)
- [Neon](https://neon.com/pricing) · [Supabase](https://supabase.com/pricing)
- [Resend](https://resend.com/pricing) · [Brevo](https://www.brevo.com/pricing/)
- [GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions) · [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Next.js: exportación estática](https://nextjs.org/docs/app/guides/static-exports) · [React Router: prerender](https://reactrouter.com/how-to/pre-rendering)
- [NestJS: base de datos](https://docs.nestjs.com/techniques/database) · [receta de Prisma](https://docs.nestjs.com/recipes/prisma) · [límite de peticiones](https://docs.nestjs.com/security/rate-limiting)
- [Sentry](https://sentry.io/pricing/) · [UptimeRobot](https://uptimerobot.com/pricing/) · [Porkbun (referencia de precios)](https://porkbun.com/products/domains)
