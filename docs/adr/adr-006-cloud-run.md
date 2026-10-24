# ADR-006: Cloud Run como hosting de la API

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- La API solo se necesita para el formulario de contacto y el panel; el sitio público es estático (ADR-003).
- RNF-10 exige un contenedor Docker del backend y CI/CD automático; RNF-11, operación en capas gratuitas (más el dominio).
- El riesgo de descubrimiento «cambios en capas gratuitas» se mitiga dockerizando el backend ([01-discovery](../discovery/01-discovery.md)).

## Decisión

**Google Cloud Run** (decisión 2 de [05 §2](../architecture/05-arquitectura-tecnica.md)): ejecuta el contenedor Docker tal cual, escala a cero y ofrece 2 millones de peticiones gratis al mes.

- Región `us-central1`, a la que se refieren las cifras de la capa gratuita (y donde Cloud Storage es gratis para el bucket de copias).
- **Máximo de una instancia** (`max-instances = 1`), límite de peticiones, alerta de presupuesto desde el primer día y revisión mensual de la factura.
- Secretos en Secret Manager; GitHub Actions se autentica con Workload Identity Federation, sin archivos de llave.
- Contrato del contenedor: escuchar en `PORT` y `0.0.0.0`, apagado ordenado con `SIGTERM` (10 s antes de `SIGKILL`), `node` ejecutado directamente en el Dockerfile ([backend-research §1.7](../architecture/backend-research.md)).
- Las migraciones corren como paso previo al despliegue, nunca al arrancar el contenedor (ADR-019).

## Alternativas consideradas

- **Render.** Descartada como opción principal: declara que su plan gratis no es para producción. Queda como **plan B** (sin tarjeta, con arranque lento).
- **Railway** y **dejar la API para después.** Descartadas sin un motivo propio documentado (confirmado por Anderson, 2026-10-24). Aplica el motivo general de elegir Cloud Run: ejecuta el contenedor Docker tal cual, escala a cero y da 2 millones de peticiones gratis al mes.

## Consecuencias

**Positivas**
- Docker estándar: la API es portable a otro proveedor.
- Coste cero dentro de la cuota; reversión rápida con las revisiones de Cloud Run (decisión 15).

**Negativas**
- **Único punto con riesgo de cobro**: exige cuenta de facturación con tarjeta.
- Arranque en frío al escalar a cero, sumado al de Neon.
- Con una instancia, el estado efímero en memoria es aceptable (ADR-008), pero condiciona escalar.
- El formato de `X-Forwarded-For` no está documentado en el contrato de Cloud Run: la IP real se valida en `ci/deploy-api` (ADR-011).

## Cuándo revisarla

- Si cambian las condiciones de la capa gratuita o aparece un cobro inesperado.
- Si hace falta más de una instancia (revisar también ADR-008).

## Fuentes

- [docs/architecture/05-arquitectura-tecnica.md](../architecture/05-arquitectura-tecnica.md) (§2 decisiones 2, 11 y 15; §5; §6)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§1.7)
- Cloud Run, precios: https://cloud.google.com/run/pricing · Capa gratuita: https://docs.cloud.google.com/free/docs/free-cloud-features
- Render, plan gratis: https://render.com/docs/free
- Contrato del contenedor: https://docs.cloud.google.com/run/docs/container-contract (consultada el 2026-10-24)
