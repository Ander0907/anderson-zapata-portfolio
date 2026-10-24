# Fase 4: Diseño UX/UI

**Estado:** borrador para validación · **Fecha:** 2026-10-23

Los diseños navegables viven en el lienzo "Diseño del portafolio" (Claude). Este documento recoge las decisiones para que el repositorio no dependa de él.

## 1. Dirección visual

| Decisión | Elección | Motivo |
|---|---|---|
| Personalidad | Editorial y sobria | Transmite criterio y confianza; funciona para reclutadores del sector financiero |
| Acento | Verde azulado (teal) | Distintivo frente al azul genérico de muchos portafolios; funciona en claro y oscuro |
| Tipografía | Titulares en Newsreader (serifa), texto en Instrument Sans | Combinación con carácter, ambas gratuitas en Google Fonts |
| Forma | Filetes de 1 px, radios de 8 y 12 px, sin sombras | La jerarquía la da el espacio, no la decoración |
| Imágenes | Una sola foto profesional; sin capturas de proyectos | Decisión de la fase 2 |

## 2. Tokens de color

Todo el color se define como variable CSS. Los ratios son WCAG 2.2, calculados con la fórmula de luminancia relativa.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#F5F8F8` | `#0C1413` | Fondo de página |
| `--surface` | `#FFFFFF` | `#132120` | Tarjetas, secciones alternas, campos |
| `--text` | `#13201F` | `#E8F0EF` | Texto principal |
| `--muted` | `#465756` | `#9DB3B1` | Texto secundario |
| `--border` | `#CBD6D5` | `#2A3F3D` | Filetes decorativos |
| `--border-strong` | `#6C7F7D` | `#5F7A77` | Bordes de campos y botones |
| `--accent` | `#0A6560` | `#4CCFC2` | Botón primario, enlaces, etiquetas |
| `--on-accent` | `#FFFFFF` | `#04201D` | Texto sobre el acento |
| `--soft` | `#DCEFEC` | `#12342F` | Fondo suave de etiquetas |
| `--danger` | `#A12D2D` | por definir | Errores de validación |

**Contrastes verificados**

| Par | Claro | Oscuro |
|---|---|---|
| `--text` sobre `--bg` | 15,7:1 | 16,1:1 |
| `--muted` sobre `--bg` | 7,1:1 | 8,5:1 |
| `--muted` sobre `--surface` | 7,6:1 | 7,5:1 |
| `--accent` sobre `--bg` | 6,5:1 | 9,8:1 |
| `--on-accent` sobre `--accent` | 6,9:1 | 9,0:1 |
| `--accent` sobre `--soft` | 5,8:1 | 7,1:1 |
| `--border-strong` sobre `--bg` (mínimo 3:1) | 4,0:1 | 4,0:1 |
| `--danger` sobre `--bg` | 6,7:1 | pendiente |

## 3. Tipografía

| Nivel | Fuente | Tamaño escritorio / móvil |
|---|---|---|
| Display (H1) | Newsreader 500 | 68 px / 40 px |
| H2 | Newsreader 500 | 44 px / 32 px |
| H3 | Newsreader 500 | 28 px |
| Texto destacado | Instrument Sans 400 | 19 px |
| Texto base | Instrument Sans 400 | 17 px, interlineado 1,65 |
| Texto pequeño | Instrument Sans 400 | 15 px |
| Etiqueta | Instrument Sans 600, mayúsculas, 0,12 em | 13 px |

## 4. Espaciado y rejilla

- Escala base de 8: 8, 16, 24, 32, 48, 64, 96, 104.
- Ancho máximo del contenido: 1160 px; márgenes de 48 px (24 px en móvil).
- Separación vertical entre secciones: 104 px (64 px en móvil).
- Sin media queries complejas: las secciones usan `flex-wrap`, por lo que se apilan solas en pantallas estrechas. El menú pasa a botón "Menú" en móvil.

## 5. Componentes base

Botón primario y secundario (48 px de alto), enlace subrayado, etiqueta de acceso al código (público/privado), campo de formulario con etiqueta visible, tarjeta, fila de proyecto, tarjeta de referencia, tabla de administración. Todos usan solo tokens.

## 5.1 Densidad de contenido

El primer borrador se sentía como un libro: párrafos largos, serifa en todo y un mismo ritmo de dos columnas. Reglas para evitarlo:

- En el inicio ningún bloque pasa de 2 o 3 líneas. El detalle vive en las fichas de proyecto.
- **Sobre mí:** dos frases, tres tarjetas con icono y un enlace a la arquitectura del sitio.
- **Experiencia:** línea de tiempo con cada cargo en una tarjeta con tres capas: (1) cifras clave en recuadros (cobertura de pruebas mínima del 90 %, 0 incidentes en migraciones a producción, 3 practicantes con mentoría, 2 aplicaciones con soporte productivo; en el cargo anterior, −90 % de deuda técnica y 7 meses hasta la promoción), (2) etiquetas de tecnologías y (3) un bloque plegable «Responsabilidades y logros» (`details`/`summary` nativos, accesibles sin JavaScript).
- **Proyectos:** tarjetas con un mini-diagrama del flujo en lugar de capturas, que no habrá. Cada paso es una etiqueta con icono; el diagrama completo tiene una descripción en texto para lectores de pantalla.
- **Habilidades:** etiquetas con icono, no párrafos.
- **Referencias:** cita corta con iniciales de la persona.
- **Ritmo:** fondos alternos y una banda de acento de borde a borde antes del formulario de contacto.

## 5.2 Iconografía

| Librería | Uso | Licencia |
|---|---|---|
| Lucide (`lucide-react`) | Iconos de interfaz | ISC |
| Simple Icons | Logos de tecnologías, como SVG sueltos | CC0 1.0 (las marcas son de sus dueños) |
| Bootstrap Icons | Solo el logo de LinkedIn, que las otras ya no incluyen | MIT |

- Tamaños de 16, 20 y 24 px; trazo de 1,8 a 2 px; color heredado (`currentColor`), así cambian solos con el tema.
- Iconos decorativos con `aria-hidden`; botones que solo tienen icono llevan `aria-label`.
- Ningún significado depende solo de un icono.
- Los logos de tecnologías solo nombran la tecnología: no se recolorean ni sugieren respaldo de la marca.
- En la implementación se importan solo los iconos usados.
- Los trazados del diseño se convirtieron a un solo `path` y se verificó por renderizado que son idénticos a los originales de Lucide (53 de 54; `palette` difería y no se usa).

## 5.3 Movimiento

La lámina "Movimiento" del lienzo tiene demos vivas y la tabla completa. Resumen:

| Elemento | Disparador | Duración y curva | Propiedades |
|---|---|---|---|
| Aparición de bloques | Entran en pantalla, una vez | 500 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, 60–120 ms entre elementos | `opacity`, `translateY` de 16 px a 0 |
| Encabezado | Scroll de más de 8 px | 200 ms | filete y fondo |
| Sección activa del menú | Scroll | 150 ms | color y subrayado |
| Línea de tiempo | Scroll por la sección | Ligada al scroll | `scaleY` |
| Flechas de enlaces | Hover y foco | 200 ms | `translateX` de 6 px |
| Bloques plegables | Abrir o cerrar | 250 ms | altura y giro del chevron |
| Cambio de tema | Clic | 250 ms | colores |
| Inicio ↔ ficha | Navegación | 300 ms | View Transitions API, con degradación |

Reglas: respetar `prefers-reduced-motion`, animar solo `transform` y `opacity`, reservar espacio para que el CLS sea 0, implementar con CSS e `IntersectionObserver` (unas 40 líneas, sin librería) y no repetir animaciones en bucle (WCAG 2.2.2).

## 6. Estrategia de tema claro y oscuro

1. Los tokens se declaran en `:root` (claro) y `:root[data-theme="dark"]`.
2. Sin preferencia guardada se usa `prefers-color-scheme`.
3. El botón del encabezado alterna el tema y guarda la elección en `localStorage`, siempre dentro de `try/catch` porque el almacenamiento puede fallar o estar bloqueado.
4. Un script mínimo en el `<head>` aplica `data-theme` antes de pintar, para evitar el parpadeo (RNF-13).

```css
:root {
  --bg: #F5F8F8; --surface: #FFFFFF; --text: #13201F; --muted: #465756;
  --border: #CBD6D5; --border-strong: #6C7F7D;
  --accent: #0A6560; --on-accent: #FFFFFF; --soft: #DCEFEC; --danger: #A12D2D;
}
:root[data-theme="dark"] {
  --bg: #0C1413; --surface: #132120; --text: #E8F0EF; --muted: #9DB3B1;
  --border: #2A3F3D; --border-strong: #5F7A77;
  --accent: #4CCFC2; --on-accent: #04201D; --soft: #12342F;
}
```

```html
<script>
  (function () {
    var theme = 'light';
    try {
      var saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') theme = saved;
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

## 7. Accesibilidad (WCAG 2.2 AA)

- Texto de 4,5:1 o más en ambos temas; bordes de campos de 3:1 o más.
- Elementos interactivos de al menos 44 px de alto y anillo de foco visible.
- Elementos nativos (`a`, `button`, `label`, `input`), un solo `h1` por página y jerarquía de encabezados ordenada.
- Enlace "Saltar al contenido" al inicio de cada página.
- Los enlaces van subrayados: el color no es el único indicador.
- Errores de formulario asociados con `aria-describedby` y `aria-invalid`.
- Enlaces externos con `rel="noopener noreferrer"`.
- Campo trampa anti-spam oculto con `aria-hidden` y `tabindex="-1"`.

## 8. Vistas entregadas

| Vista | Qué muestra |
|---|---|
| Inicio, escritorio | Encabezado, presentación, datos destacados, perfil, experiencia plegable, proyectos con mini-diagrama, habilidades como etiquetas, referencias, banda de contacto, formulario y pie. Navegable, con el cambio de tema funcionando |
| Inicio, móvil, tema oscuro | La misma página en 390 px con menú colapsable |
| Guía de estilo | Tokens de ambos temas con contrastes, tipografía, espaciado, iconografía y componentes |
| Movimiento | Cuatro demos vivas, tabla de especificación y reglas |
| Detalle de proyecto | Ficha con rol, stack, problema, solución, decisiones y resultado |
| Panel de administración | Gestión de referencias: listado y formulario con validación |
| Arquitectura del sitio | Resumen «En 30 segundos», tres flujos (lectura pública, escritura, entrega), tabla de stack con estado, decisiones (ADR) y calidad. Aviso visible de que describe la arquitectura planificada |

## 9. Alcance de esta entrega y pendientes

- **No se dibujó** el inicio de sesión del panel, ni los listados de proyectos, experiencia, habilidades y mensajes del panel. Siguen el mismo patrón que la vista de referencias.
- **Se pasó directamente a diseño de alta fidelidad**, sin wireframes de baja fidelidad. En un proyecto de una sola persona, el costo de iterar sobre el diseño final es similar y el resultado ya sirve de guía para el desarrollo.
- **Contenido pendiente:** LinkedIn y texto de las tres referencias, repositorio del proyecto del SENA. Las tarjetas de referencias muestran un texto de relleno marcado como tal.
- **Tema oscuro del color de error** sin definir.
- **El lienzo no se revisó visualmente.** Los contrastes y los trazados de iconos se verificaron con cálculo y renderizado, pero la maquetación (sobre todo en móvil) debe revisarse abriendo el lienzo.
- **Figma:** sin decidir. El código será la fuente de verdad; si se quiere en Figma, lo más realista es importar los tokens como variables y rehacer las pantallas clave.

## 10. Preguntas abiertas

1. ¿La dirección visual (editorial, teal, serifa) te convence tras verla, o ajustamos algo?
2. ¿El orden de las secciones (perfil, experiencia, proyectos, habilidades, referencias, contacto) es el que quieres?
3. ¿Dibujamos ahora el login del panel, o lo hacemos durante el desarrollo?
