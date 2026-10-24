# ADR-003: Contenido público independiente del backend (publicar y reconstruir)

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- RNF-02: el contenido público «debe poder mostrarse aunque el backend esté dormido». Criterio de aceptación: con el backend apagado, las secciones públicas siguen visibles; solo el formulario muestra un mensaje de reintento ([02-requirements](../requirements/02-requirements.md)).
- La API en Cloud Run escala a cero y Neon suspende el cómputo: el arranque en frío se suma (ADR-006, [05 §6](../architecture/05-arquitectura-tecnica.md)).
- El contenido cambia con poca frecuencia, lo que habilita contenido pre-generado (supuesto de la fase 2).
- Se piden SEO (RNF-04) y Lighthouse > 90 (RNF-01).

## Decisión

**Publicar y reconstruir** (decisión 6 de [05 §2](../architecture/05-arquitectura-tecnica.md)), con Next.js en exportación estática (decisión 7):

1. En el panel se edita el contenido; cada fila tiene el indicador `published` (borrador o publicado).
2. Al pulsar **Publicar**, la API envía un `repository_dispatch` a GitHub.
3. GitHub Actions compila Next.js con `output: 'export'`; las páginas piden el contenido **publicado** a la API durante el build.
4. El sitio resultante se despliega en Cloudflare.

Reglas asociadas: el build reintenta la lectura y **nunca publica con datos vacíos** (D19); cada disparo se registra en la tabla `publish_event` como antirrebote y para mostrar «última publicación»; editar algo ya publicado sale en el siguiente build, sin «versiones publicadas» separadas ([backend-research-definition §4, preguntas 29 y 30](../architecture/backend-research-definition.md)).

## Alternativas consideradas

- **Archivo JSON publicado por la API.** Descartada: peor SEO y rendimiento que HTML pre-generado, según la tabla de decisiones.
- **Consulta directa a la API desde el sitio.** Descartada: el sitio dependería de que la API esté despierta, contra RNF-02.

## Consecuencias

**Positivas**
- El sitio sigue funcionando con la API dormida; mejor SEO y rendimiento.
- Separación clara entre borrador y publicado.

**Negativas**
- Cada publicación tarda unos minutos y consume un build de los 500 mensuales de Cloudflare Pages, si se usa ese producto; de ahí el antirrebote en base de datos.
- El build depende de que la API responda tras un arranque en frío (riesgo G8, mitigado con D19).
- Hace falta un token para `repository_dispatch`; sus permisos exactos (fine-grained, probablemente «Contents: write») se comprueban al crearlo (G15).
- El método de despliegue en Cloudflare (Pages o Workers con activos estáticos) sigue pendiente ([05 §9](../architecture/05-arquitectura-tecnica.md)).

## Cuándo revisarla

- Si el contenido pasa a cambiar con mucha frecuencia o se acerca al límite de builds mensuales.
- Si aparece contenido que deba ser dinámico por visitante.

## Fuentes

- [docs/architecture/05-arquitectura-tecnica.md](../architecture/05-arquitectura-tecnica.md) (§2 decisiones 6 y 7, §4)
- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§3.4 D19, §4, §6 G8 y G15)
- [docs/requirements/02-requirements.md](../requirements/02-requirements.md) (RNF-01, RNF-02, RNF-04)
- Next.js, exportación estática: https://nextjs.org/docs/app/guides/static-exports
- GitHub, `repository_dispatch`: https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event (consultada el 2026-10-24)
