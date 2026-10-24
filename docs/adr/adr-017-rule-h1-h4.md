# ADR-017: Regla H1–H4 (hexagonal ligera o CRUD plano)

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- La API es un monolito modular por funcionalidad que mantiene una persona ([manual §7.2](../process/06-manual-de-desarrollo.md)).
- Algunas operaciones tienen lógica real (llamadas a terceros, orden entre efectos, reglas de negocio) y otras son lectura y escritura sin reglas.
- Aplicar puertos y casos de uso a todo crea «capas por si acaso»; no aplicarlos a nada deja sin probar la lógica que importa.

## Decisión

Checklist aplicado **por operación, no por módulo** ([backend-research-definition §3.3](../architecture/backend-research-definition.md); detalle en [backend-research §C](../architecture/backend-research.md)). Basta un «sí» y se crea **solo** lo que esa pregunta activa:

| # | Pregunta | Si «sí» |
|---|---|---|
| H1 | ¿Llama a un sistema externo distinto de PostgreSQL? | Puerto y adaptador para ese sistema |
| H2 | ¿Coordina dos o más efectos con un orden o semántica de fallo que importen? | Caso de uso y puerto de repositorio |
| H3 | ¿Tiene una regla de negocio que no es validación de forma? | Función o clase de dominio pura |
| H4 | ¿Su resultado depende del reloj o del azar? | Inyectar `Clock` o `IdGenerator` |

Si todo es «no»: **CRUD plano** (`controller → service → PrismaService`, con mapper de salida), probado con PostgreSQL real y **sin simular Prisma**. Una escritura anidada en una transacción no activa H2.

**Resultado por módulo:** `health`, `content-read` y `admin-content` son CRUD plano; `contact`, `auth` y `publish` son hexagonal ligera; la bandeja de mensajes es CRUD plano, con una función pura de transición de estado si se confirman reglas.

**Cumplimiento:** una carpeta `domain/` o `application/` sin una regla H que la justifique se rechaza en revisión. El linter prohíbe en esas carpetas importar `@prisma/*`, el cliente generado, `@nestjs/*`, `resend` y `express`; `@nestjs/common` se permite en `application/` **solo** para `@Injectable` e `@Inject` (D14).

## Alternativas consideradas

- **Hexagonal en todos los módulos.** Descartada: capas sin regla que las justifique en módulos CRUD.
- **Lógica en el controlador o el servicio en todos los casos.** Descartada para las operaciones con H1–H4: no se prueba sin HTTP ni sin red.
- **CQRS, event sourcing, DDD completo, repositorio genérico.** Descartados por sobreingeniería ([backend-research-definition §3.2](../architecture/backend-research-definition.md)).

## Consecuencias

**Positivas**
- Capas solo donde hay lógica; el resto es simple y se prueba contra una base real.
- Criterio verificable en revisión y en parte por el linter.

**Negativas**
- Dos estilos conviven en el código; hay que justificar cada operación.
- El umbral de cobertura del 90 % en `domain/` y `application/` depende de que esas carpetas existan solo cuando toca.

## Cuándo revisarla

- Si un módulo CRUD acumula reglas de negocio (se aplica H3 a esa operación, no al módulo).
- Si la mayoría de operaciones nuevas activan H1–H4 y la convivencia de estilos se vuelve confusa.

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§3.1, §3.2, §3.3)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§B, §C, D14)
- [docs/process/06-manual-de-desarrollo.md](../process/06-manual-de-desarrollo.md) (§7.2)
