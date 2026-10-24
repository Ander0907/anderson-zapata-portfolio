# ADR-004: Tema claro y oscuro con tokens de diseño

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- RF-10 (MVP): modo oscuro/claro que respeta la preferencia del sistema y permite alternar manualmente. En la validación de requisitos se decidió tenerlo «desde el inicio (MVP)».
- RNF-13: colores definidos como variables (design tokens) con tema claro y oscuro; la preferencia del visitante se recuerda; sin parpadeo al cargar; contraste AA en ambos temas.
- RNF-03: WCAG 2.2 AA. RNF-01: Lighthouse > 90.
- El sitio es estático (ADR-003): el tema se resuelve en el navegador, sin servidor.

## Decisión

Según [04-ux-ui §2 y §6](../design/04-ux-ui.md):

1. Todo el color es una **variable CSS** (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--border-strong`, `--accent`, `--on-accent`, `--soft`, `--danger`). Los componentes usan solo tokens.
2. Los tokens se declaran en `:root` (claro) y en `:root[data-theme="dark"]` (oscuro).
3. Sin preferencia guardada se usa `prefers-color-scheme`.
4. El botón del encabezado alterna el tema y guarda la elección en `localStorage`, siempre dentro de `try/catch`.
5. Un script mínimo en el `<head>` aplica `data-theme` antes de pintar, para evitar el parpadeo.
6. Los iconos usan `currentColor`, así cambian solos con el tema; el cambio de tema se anima 250 ms y respeta `prefers-reduced-motion`.

Los contrastes de cada par de tokens están verificados con la fórmula de luminancia relativa de WCAG 2.2 (tabla en §2 del documento de diseño).

## Alternativas consideradas

- No se evaluaron alternativas (confirmado por Anderson, 2026-10-24).

## Consecuencias

**Positivas**
- Un único punto de verdad para el color; cambiar de tema es cambiar variables.
- Sin parpadeo al cargar y con la preferencia recordada, como pide RNF-13.

**Negativas**
- Un script en línea en el `<head>`, que debe tenerse en cuenta en la política de seguridad de contenido si se define una.
- **`--danger` en tema oscuro está «por definir»** y su contraste «pendiente» (color de error en tema oscuro, [05 §9](../architecture/05-arquitectura-tecnica.md)). Hasta resolverlo, RNF-13 no se cumple por completo.

## Cuándo revisarla

- Si se añade un tercer tema o se requiere alto contraste.
- Si un token nuevo no alcanza el contraste AA en alguno de los temas.

## Fuentes

- [docs/design/04-ux-ui.md](../design/04-ux-ui.md) (§2, §5.2, §5.3, §6, §7)
- [docs/requirements/02-requirements.md](../requirements/02-requirements.md) (RF-10, RNF-03, RNF-13)
- [docs/architecture/05-arquitectura-tecnica.md](../architecture/05-arquitectura-tecnica.md) (§9)
