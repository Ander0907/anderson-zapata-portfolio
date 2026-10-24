# Fase 1: Descubrimiento y definición

**Estado:** cerrada · **Fecha:** 2026-10-22

## Visión
Un portafolio profesional que cumple dos funciones a la vez: presentar mi perfil a reclutadores y clientes, y servir como evidencia pública de cómo construyo software de calidad.

## Objetivos
1. **Visibilidad:** que reclutadores y clientes encuentren mi perfil, entiendan rápido qué hago y me contacten.
2. **Aprendizaje deliberado:** consolidar React y adoptar NestJS con una arquitectura moderna en un proyecto real y completo.
3. **Calidad demostrable:** que el repositorio y el proceso sean una referencia técnica (arquitectura clara, pruebas, CI/CD, documentación).

## Públicos
- **Primario:** reclutadores y clientes potenciales. Tienen poco tiempo: deben entender quién soy, qué he hecho y cómo contactarme en menos de un minuto.
- **Secundario:** desarrolladores y equipos técnicos que revisan el código y la arquitectura como muestra de mi nivel.

## Propuesta de valor
Un sitio con identidad propia, sin plantillas, donde el producto y el proceso de construcción también forman parte del portafolio.

## Decisiones cerradas
| Tema | Decisión |
|---|---|
| Evaluación del código | Los entrevistadores revisan el repositorio y la arquitectura |
| Backend | Formulario de contacto + panel de administración para gestionar contenido |
| Stack | React (frontend) + Node/NestJS (backend) + PostgreSQL |
| Idioma | Solo español |
| Plazo | Meta ideal de 1 mes; plan realista de 3 meses |
| Ritmo | Sesiones largas de fin de semana |
| Presupuesto | Capas gratuitas de hosting; dominio propio sí (costo anual aceptado) |
| Repositorio | Público desde el primer commit, en GitHub |

## Decisión de stack: por qué NestJS
Se evaluó Java + Spring Boot. Se eligió NestJS por hosting más sencillo (arranque en frío rápido, menor consumo de memoria, más opciones de alojamiento) y por reducir tiempo y esfuerzo. Java + Spring Boot queda como proyecto futuro.

## Restricciones
- Desarrollo desde cero y en solitario.
- Disponibilidad irregular: el alcance debe ser terminable en sesiones de fin de semana.
- Como el código será evaluado, la calidad pesa tanto como la funcionalidad.

## Riesgos
| Riesgo | Mitigación |
|---|---|
| Sobreingeniería | Monolito modular; sin microservicios |
| Cambios en capas gratuitas | Dockerizar el backend; plan B de hosting definido en la fase 5 |
| Cold start del backend | Contenido público que no dependa del backend despierto (pre-generado o en caché) |
| Alcance infinito | MVP definido en la fase 2 |

## Métricas de éxito
- Sitio publicado en dominio propio con HTTPS.
- Lighthouse superior a 90 en rendimiento, accesibilidad y SEO.
- Cobertura de pruebas razonable en el backend y pipeline de CI/CD funcionando.
- Mensajes de contacto recibidos y visitas desde LinkedIn/CV.
- Documentación que un tercero pueda seguir sin mi ayuda.
