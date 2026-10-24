# ADR-011: Dominio único de la API a través de Cloudflare y cookie de sesión

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- Si el panel vive en el dominio `.dev` y la API en `*.run.app`, la cookie de sesión es de terceros (cross-site): muchos navegadores la bloquean y obligaría a `SameSite=None` y a debilitar la protección CSRF (riesgo G1, que bloqueaba `feat/admin-auth`).
- La asignación de dominio de Cloud Run está en **Preview y «no recomendada para producción»**. Un balanceador de carga global tiene coste (contra RNF-11).
- Para limitar peticiones, la API necesita la IP real del cliente; con un proxy delante hay un salto más y la cabecera puede falsificarse.

## Decisión

**Mismo dominio a través de Cloudflare** (decisión personal de Anderson, [backend-research-definition §2.6](../architecture/backend-research-definition.md)):

- El navegador solo habla con el dominio `.dev`; Cloudflare reenvía las rutas `/api/*` a Cloud Run. Para el navegador es un solo origen: sin CORS ni cookie de terceros.
- La cookie de sesión usa `SameSite=Strict` y el prefijo `__Host-` (detalles en ADR-012).
- **IP real** ([§2.5](../architecture/backend-research-definition.md)): `trust proxy = 1` y `req.ip`, nunca `req.ips[0]`. Propuesta a validar: el reenvío de Cloudflare añade la IP real y una clave secreta compartida, y la API **solo confía en esa IP si la clave es correcta**. Prueba manual documentada: `curl -H 'X-Forwarded-For: 1.2.3.4'` no debe cambiar el contador.

**Validación pospuesta (decisión de Anderson del 2026-10-24):** la validación del reenvío por Cloudflare se hace en la rama **`ci/deploy-api`**, que se ejecuta **después de las pruebas locales completas** ([manual §12](../process/06-manual-de-desarrollo.md)). Mientras tanto, `feat/admin-auth` se desarrolla y prueba en local con el modelo de origen único.

**Criterios para dar por buena la opción** (en `ci/deploy-api`): una petición de la web llega a la API; la cookie se guarda y se envía; la IP real llega bien; el coste sigue en cero; y las peticiones por el reenvío caben en el límite gratuito de Cloudflare (100 000 al día para Workers).

**Plan B:** si la prueba falla (latencia, IP o complejidad), se usa **`api.<dominio>.dev`** con la asignación de dominio de Cloud Run (mismo *site*, así que `SameSite=Lax`/`Strict` funciona), aceptando que está en Preview.

## Alternativas consideradas

- **API en `*.run.app` con cookie cross-site.** Descartada: cookie bloqueada y CSRF más débil.
- **`api.<dominio>.dev` con asignación de dominio de Cloud Run.** Plan B, no primera opción: Google la marca como Preview y no recomendada para producción.
- **Balanceador de carga global.** Descartada por coste.

## Consecuencias

**Positivas**
- Cookie con la protección más estricta y sin configuración CORS para el panel.
- Una sola puerta pública (Cloudflare) para sitio y API.

**Negativas**
- La opción elegida **está sin probar** hasta `ci/deploy-api`; el trabajo del panel se apoya en una hipótesis con plan B.
- Un salto más en la cadena (latencia y cálculo de la IP real) y una clave compartida más que gestionar como secreto.
- El reenvío consume peticiones del plan gratuito de Cloudflare.

## Cuándo revisarla

- Si `ci/deploy-api` no cumple algún criterio (pasar al plan B y actualizar este ADR).
- Si la asignación de dominio de Cloud Run sale de Preview, o cambian los límites de Workers.

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§2.5, §2.6, §6 G1–G2)
- [docs/architecture/05-arquitectura-tecnica.md](../architecture/05-arquitectura-tecnica.md) (§4, actualizaciones del 2026-10-24)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§12)
- Cloud Run, dominios personalizados: https://docs.cloud.google.com/run/docs/mapping-custom-domains · balanceador HTTPS: https://docs.cloud.google.com/load-balancing/docs/https (consultadas el 2026-10-24)
- Express detrás de proxies: https://expressjs.com/en/guide/behind-proxies.html (consultada el 2026-10-24)
