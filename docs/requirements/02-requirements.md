# Fase 2: Requisitos y alcance

**Estado:** cerrada · **Fecha:** 2026-10-22

## 1. Actores
- **Visitante** (reclutador, cliente, desarrollador): consulta el sitio y puede contactarme.
- **Administrador** (yo): gestiona el contenido y los mensajes recibidos.

## 2. Requisitos funcionales

### Sitio público
| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Página de inicio con presentación, propuesta de valor y llamadas a la acción (contacto, CV, GitHub, LinkedIn) | MVP |
| RF-02 | Sección "Sobre mí" con perfil profesional | MVP |
| RF-03 | Listado de proyectos con detalle de cada uno (descripción, stack, decisiones técnicas, enlace al repositorio solo si es público). Sin capturas ni demos en vivo | MVP |
| RF-04 | Sección de habilidades agrupadas por categoría | MVP |
| RF-05 | Experiencia profesional en línea de tiempo | MVP |
| RF-06 | Descarga del CV en PDF | MVP |
| RF-07 | Formulario de contacto con validación y protección anti-spam | MVP |
| RF-08 | Página de arquitectura del propio portafolio (diagramas, ADRs, enlaces al repo) dirigida a evaluadores técnicos | MVP |
| RF-09 | Blog o artículos técnicos | Post-MVP |
| RF-10 | Modo oscuro/claro (respeta la preferencia del sistema y permite alternar manualmente) | MVP |
| RF-18 | Sección de referencias: testimonios positivos de compañeros de trabajo, cada uno con nombre, cargo y enlace directo a su perfil de LinkedIn | MVP |

### Panel de administración
| ID | Requisito | Prioridad |
|---|---|---|
| RF-11 | Inicio de sesión seguro del administrador | MVP |
| RF-12 | CRUD de proyectos | MVP |
| RF-13 | Gestión de habilidades y experiencia | MVP |
| RF-14 | Bandeja de mensajes de contacto (leer, marcar, archivar) | MVP |
| RF-15 | Notificación por correo al recibir un mensaje | MVP |
| RF-16 | Analítica básica de visitas | Post-MVP |
| RF-17 | CRUD de artículos (si se hace el blog) | Post-MVP |
| RF-19 | CRUD de referencias: nombre, cargo, enlace a LinkedIn, texto de la referencia, orden de aparición y visible/oculta | MVP |

## 3. Requisitos no funcionales
| ID | Categoría | Requisito |
|---|---|---|
| RNF-01 | Rendimiento | Lighthouse > 90; carga inicial rápida |
| RNF-02 | Disponibilidad del contenido público | Debe poder mostrarse aunque el backend esté dormido (contenido pre-generado o en caché) |
| RNF-03 | Accesibilidad | Cumplir WCAG 2.2 AA |
| RNF-04 | SEO | Metadatos, Open Graph, sitemap, HTML semántico |
| RNF-05 | Responsive | Escritorio, tablet y móvil |
| RNF-06 | Seguridad | Hash de contraseñas, validación de entradas, rate limiting, CORS restringido, cabeceras de seguridad, secretos fuera del repo |
| RNF-07 | Calidad de código | Linter, formatter, TypeScript estricto, commits convencionales |
| RNF-08 | Pruebas | Unitarias e integración en backend; pruebas de componentes en frontend; algunas pruebas E2E del flujo crítico |
| RNF-09 | Documentación | README, ADRs, diagramas de arquitectura, guía de instalación local |
| RNF-10 | Despliegue | Contenedor Docker del backend y pipeline CI/CD automático |
| RNF-11 | Costo | Operación en capas gratuitas (más dominio) |
| RNF-12 | Idioma | Solo español |
| RNF-13 | Tematización | Colores definidos como variables (design tokens) con tema claro y oscuro; la preferencia del visitante se recuerda; sin parpadeo al cargar; contraste AA en ambos temas |
| RNF-14 | Privacidad | Solo se publican referencias con consentimiento de la persona; los enlaces externos usan `rel="noopener noreferrer"`; el administrador valida que el enlace sea una URL de LinkedIn |

## 4. Historias de usuario (MVP)
- Como **reclutador**, quiero entender en menos de un minuto quién es y qué hace, para decidir si lo contacto.
- Como **reclutador**, quiero descargar su CV, para compartirlo con mi equipo.
- Como **cliente**, quiero ver proyectos con su contexto y resultado, para evaluar si puede resolver mi necesidad.
- Como **visitante**, quiero enviar un mensaje desde el sitio, para contactarlo sin salir de la página.
- Como **evaluador técnico**, quiero ver la arquitectura, las decisiones y el repositorio, para juzgar su nivel de ingeniería.
- Como **reclutador**, quiero leer lo que dicen compañeros de trabajo y verificar quiénes son en LinkedIn, para confiar en su perfil.
- Como **visitante**, quiero alternar entre tema claro y oscuro, para leer con comodidad.
- Como **administrador**, quiero actualizar proyectos y experiencia sin tocar código, para mantener el sitio al día.
- Como **administrador**, quiero agregar, editar, ordenar y ocultar referencias, para mantener solo las más relevantes.
- Como **administrador**, quiero recibir un aviso cuando alguien me escribe, para responder a tiempo.

## 5. Criterios de aceptación de ejemplo
- **RF-07:** al enviar un formulario válido, se guarda el mensaje, se notifica por correo y el visitante ve una confirmación. Con datos inválidos, se muestran errores claros y no se guarda nada. Un bot que llena el campo trampa es descartado.
- **RNF-02:** con el backend apagado, las secciones públicas siguen visibles; solo el formulario muestra un mensaje de reintento.
- **RF-19:** el administrador no puede guardar una referencia sin nombre, cargo, texto y un enlace válido de LinkedIn. Una referencia oculta no aparece en el sitio público.
- **RF-18:** cada referencia muestra nombre, cargo y texto; el nombre enlaza al perfil de LinkedIn en una pestaña nueva.

## 6. Fuera del alcance del MVP
Blog, analítica propia, internacionalización, comentarios, autenticación de visitantes, capturas y demos en vivo de proyectos.

## 7. Supuestos
- El administrador es una sola persona.
- El contenido cambia con poca frecuencia, lo que habilita contenido pre-generado.
- Los límites de las capas gratuitas se validarán en la fase 5.

## 8. Decisiones tomadas en la validación
| Pregunta | Decisión |
|---|---|
| Blog | Después del MVP |
| Modo oscuro | Desde el inicio (MVP) |
| Capturas o demos en vivo | No |
| Recepción de mensajes | Panel de administración y correo |
| Redacción de contenido | En conjunto, durante la fase 4 |
| Sección de referencias | Nueva, en el MVP (RF-18, RF-19) |

## 9. Decisiones sobre referencias
| Tema | Decisión |
|---|---|
| Cargo | Cargo + empresa en texto corto (por ejemplo, "Tech Lead, Empresa X") |
| Texto de la referencia | Obligatorio |
| Ubicación | Sección en la página principal con las referencias destacadas |
| Autorización de las personas | Confirmada por el administrador |

