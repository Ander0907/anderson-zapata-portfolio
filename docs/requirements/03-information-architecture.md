# Fase 3: Contenido y arquitectura de información

**Estado:** cerrada, a la espera de confirmar la lista de proyectos · **Fecha:** 2026-10-22

## 1. Principios
- **Escaneable en menos de un minuto:** quién soy, qué hago, pruebas y cómo contactarme.
- **Dos recorridos:** reclutador/cliente (perfil y contacto) y evaluador técnico (arquitectura y repositorio).
- **Contenido público independiente del backend** (RNF-02).
- **Sin duplicar:** cada dato vive en un solo lugar y se reutiliza.

## 2. Mapa del sitio

### Público
```
/                      Inicio (página principal de una sola vista larga)
 ├─ #inicio            Presentación y llamadas a la acción
 ├─ #sobre-mi          Perfil profesional
 ├─ #experiencia       Línea de tiempo
 ├─ #proyectos         Proyectos destacados
 ├─ #habilidades       Habilidades por categoría
 ├─ #referencias       Referencias destacadas
 └─ #contacto          Formulario y enlaces
/proyectos/:slug       Detalle de un proyecto
/arquitectura          Arquitectura de este portafolio (para evaluadores técnicos)
/404                   Página no encontrada
```

### Administración (privado, fuera del índice de buscadores)
```
/admin/login
/admin                 Resumen
/admin/proyectos       Listado, crear, editar
/admin/experiencia
/admin/habilidades
/admin/referencias
/admin/mensajes        Bandeja de contacto
```

## 3. Navegación
- **Barra principal:** Sobre mí · Experiencia · Proyectos · Habilidades · Referencias · Contacto · Arquitectura · selector de tema.
- **Acciones persistentes:** descargar CV, GitHub, LinkedIn.
- **Pie de página:** enlaces sociales, repositorio del portafolio, nota de privacidad.
- **Móvil:** menú colapsable; el botón de contacto siempre alcanzable.

## 4. Inventario de contenido

| Entidad | Campos | Obligatorio |
|---|---|---|
| **Perfil** | Nombre, titular profesional, resumen corto, resumen largo, ubicación, correo público, enlaces (GitHub, LinkedIn), URL del CV | Todos salvo ubicación |
| **Experiencia** | Cargo, empresa, fecha de inicio, fecha de fin (o actual), descripción, logros, tecnologías | Cargo, empresa, fechas, descripción |
| **Proyecto** | Título, slug, resumen, descripción, problema, solución, decisiones técnicas, stack, enlace al repositorio, orden, destacado, visible | Título, resumen, descripción, stack, repositorio |
| **Habilidad** | Nombre, categoría, nivel (opcional), orden | Nombre, categoría |
| **Referencia** | Nombre, cargo y empresa, enlace a LinkedIn, texto, orden, destacada, visible | Todos |
| **Mensaje** | Nombre, correo, asunto, mensaje, fecha, estado (nuevo, leído, archivado) | Todos salvo asunto |

**Categorías de habilidades (propuesta):** Frontend · Backend · Bases de datos · DevOps y herramientas · Prácticas de ingeniería.

## 5. Estructura de la página principal

| Sección | Qué responde | Contenido |
|---|---|---|
| Inicio | ¿Quién es y qué hace? | Nombre, titular, frase de valor, botones de contacto y CV |
| Sobre mí | ¿Cómo trabaja? | Resumen breve, enfoque, qué busca |
| Experiencia | ¿Dónde ha trabajado? | Línea de tiempo con logros |
| Proyectos | ¿Qué ha construido? | Tarjetas de proyectos destacados con enlace al detalle |
| Habilidades | ¿Con qué tecnologías? | Agrupadas por categoría |
| Referencias | ¿Qué dicen otros? | Tarjetas con texto, nombre, cargo y enlace a LinkedIn |
| Contacto | ¿Cómo lo contacto? | Formulario, correo, enlaces |

## 6. Página de arquitectura (para evaluadores técnicos)
Contenido propuesto:
- Visión general y diagrama de la solución.
- Stack y por qué se eligió.
- Decisiones de arquitectura (resumen de los ADR, con enlace al repositorio).
- Estrategia de pruebas y calidad.
- Pipeline de CI/CD y despliegue.
- Seguridad.
- Cómo ejecutar el proyecto localmente.
- Enlace al repositorio.

## 7. Recorridos de usuario
1. **Reclutador:** Inicio → Experiencia → Proyectos → Referencias → CV → Contacto.
2. **Cliente:** Inicio → Proyectos → detalle → Contacto.
3. **Evaluador técnico:** Inicio → Arquitectura → repositorio.
4. **Administrador:** Login → editar contenido o revisar mensajes → cerrar sesión.

## 8. SEO y estructura de URL
- URLs en español, cortas y legibles; un único `h1` por página.
- Título y descripción propios por página, Open Graph y sitemap.
- Datos estructurados de tipo `Person` en la página principal.
- `/admin` con `noindex` y bloqueado en `robots.txt`.

## 9. Lista de contenido por preparar
- [ ] Titular y resumen profesional
- [ ] Historial laboral con logros
- [ ] Proyectos a destacar (con problema, solución y decisiones técnicas)
- [ ] Lista de habilidades por categoría
- [ ] Referencias con texto, nombre, cargo y enlace a LinkedIn
- [ ] CV en PDF actualizado
- [ ] Foto profesional (opcional)

## 10. Decisiones
| Tema | Decisión |
|---|---|
| Estructura | Una sola página principal con secciones |
| Foto | Sí, habrá foto del administrador |
| Proyectos | Fichas con contexto redactado (problema, rol, solución, decisiones, stack, resultado); entre 4 y 6 en total, 3 o 4 destacados |
| Enlace al repositorio | Opcional, solo si el proyecto es público (ajuste a RF-03) |
| Habilidades | Agrupadas por categoría, sin porcentajes ni niveles |
| Contenido | Primer borrador en `contenido-borrador.md`, a refinar en la fase 4 |
| Fuente del contenido | Hoja de vida del administrador |
