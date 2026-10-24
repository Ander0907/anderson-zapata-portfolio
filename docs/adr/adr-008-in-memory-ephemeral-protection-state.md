# ADR-008: Estado en memoria solo para protecciones efímeras, con una instancia

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- El manual pedía una API «sin estado en memoria», y la lista original de ADR del documento de arquitectura (§8) incluía «límite de peticiones en memoria con una sola instancia». La investigación de Fase 0 señaló la aparente contradicción.
- `@nestjs/throttler` guarda sus contadores en memoria por defecto; su documentación solo exige un almacén compartido (Redis) cuando hay varias instancias.
- Cloud Run está limitado a `max-instances = 1` como mitigación de coste (ADR-006, [05 §6](../architecture/05-arquitectura-tecnica.md)).
- El riesgo G9 de la investigación: el limitador en memoria se reinicia al escalar a cero o al desplegar; protección parcial, aceptable.

## Decisión

No hay contradicción: «sin estado» significa que ningún dato **importante** (sesiones, contenido) vive en el proceso. Se adopta literalmente la redacción de [backend-research-definition §2.8](../architecture/backend-research-definition.md):

> «La API no guarda en memoria del proceso ningún estado de negocio ni de sesión: la sesión viaja en una cookie firmada y los datos están en PostgreSQL. Se permite únicamente estado **efímero de protección** (contadores del limitador y, si aplica, el antirrebote de publicación), cuya pérdida no afecta a la corrección; es válido mientras `max-instances = 1` (ADR-008). Si se escala a más de una instancia, ese estado pasa a un almacén compartido o a la base de datos, y se revisa el ADR.»

Precisión de la misma sección: el **antirrebote de «Publicar» se guarda en la base de datos** (tabla `publish_event`), no en memoria, porque protege un recurso escaso (los 500 builds al mes) y sirve para mostrar «última publicación». En la práctica, el único estado efímero en memoria son los contadores del limitador.

## Alternativas consideradas

- **Almacén compartido (Redis) desde el principio.** Descartada: con una sola instancia no hay nada que compartir, y Redis está en la lista de patrones descartados por sobreingeniería (va contra RNF-11).
- **Contadores del limitador en PostgreSQL.** Descartada para el limitador: su pérdida no afecta a la corrección, así que no justifica una escritura por petición. (Sí se usa la base para el antirrebote de publicación, por el motivo anterior.)
- **Prohibir todo estado en memoria.** Descartada: obligaría a un almacén externo solo para contadores descartables.

## Consecuencias

**Positivas**
- Sin infraestructura adicional; se usa el almacén por defecto de `@nestjs/throttler`.
- La regla de «sin estado» queda definida con precisión y es verificable en revisión.

**Negativas**
- Al reiniciar, escalar a cero o desplegar se pierden los contadores: se «regala» una ventana de peticiones.
- La decisión ata la API a una instancia; escalar exige revisar este ADR.

## Cuándo revisarla

- Si `max-instances` pasa a ser mayor que 1.
- Si aparece cualquier otro estado en memoria cuya pérdida sí afecte a la corrección.

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§2.8, §6 G9)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§8, G9)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§7.5, «API sin estado»)
- NestJS, límite de peticiones: https://docs.nestjs.com/security/rate-limiting (consultada el 2026-10-24)
