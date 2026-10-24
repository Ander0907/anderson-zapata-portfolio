# ADR-016: `/health` sin base de datos y monitoreo

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- El monitoreo de disponibilidad hace peticiones periódicas. Según [05 §6](../architecture/05-arquitectura-tecnica.md), una revisión cada 5 minutos son unas 8 640 peticiones al mes (0,4 % de los 2 millones de Cloud Run). El riesgo está en el CPU y en Neon:
  - si cada revisión arranca un contenedor frío, en el peor caso consume cerca de la mitad de los 180 000 vCPU-segundos gratuitos;
  - si la revisión toca la base de datos, **Neon nunca se suspende** y supera las 100 CU-horas gratuitas (suponiendo un mínimo de 0,25 CU, por verificar).
- El sitio público no depende de la API (ADR-003).

## Decisión

1. **El `/health` de la API nunca toca la base de datos** ([manual §7.5](../process/06-manual-de-desarrollo.md)). Es un controlador sin servicio y sin Terminus ([backend-research §C](../architecture/backend-research.md)).
2. **Monitoreo según la decisión 9** de [05 §2](../architecture/05-arquitectura-tecnica.md): **UptimeRobot, Sentry y Cloudflare Web Analytics**, tres capas independientes sin coste; la analítica no usa cookies.
3. **El monitor principal vigila el sitio público**, no la API.
4. Se mide el consumo real durante el primer mes y hay alerta de presupuesto en Google Cloud.

## Alternativas consideradas

- **`/health` que comprueba la conexión a PostgreSQL** (por ejemplo, con Terminus). Descartada: mantendría Neon despierto y agotaría su cuota gratuita.
- **Solo disponibilidad y analítica** (sin Sentry). Descartada en la decisión 9 en favor de tres capas.

## Consecuencias

**Positivas**
- El monitoreo no impide que Neon se suspenda ni fuerza el consumo de CPU de la API.
- Errores de aplicación visibles en Sentry sin depender del health check.

**Negativas**
- Un `/health` en verde no garantiza que la base de datos responda; los fallos de base se detectan por errores (Sentry) o por las propias peticiones.
- Sentry limita a 5 000 errores al mes, y sus términos de uso y si exige tarjeta están sin confirmar ([05 §6 y §9](../architecture/05-arquitectura-tecnica.md)).
- El mínimo de 0,25 CU de Neon está por verificar.

## Cuándo revisarla

- Tras medir el consumo real del primer mes.
- Si se necesita una comprobación de dependencias (en ese caso, en una ruta distinta y con frecuencia baja).
- Si cambian los límites gratuitos de Cloud Run, Neon, UptimeRobot o Sentry.

## Fuentes

- [docs/architecture/05-arquitectura-tecnica.md](../architecture/05-arquitectura-tecnica.md) (§2 decisión 9, §5, §6, §9)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§7.5)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§1.1, §C)
- UptimeRobot: https://uptimerobot.com/pricing/ · Sentry: https://sentry.io/pricing/ · Cloudflare Web Analytics: https://www.cloudflare.com/web-analytics/
- Cloud Run, precios: https://cloud.google.com/run/pricing · Neon, precios: https://neon.com/pricing (revisión de límites del 2026-10-24)
