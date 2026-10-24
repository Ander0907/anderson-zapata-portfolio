# ADR-007: Entrar con GitHub en lugar de contraseñas propias

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- RF-11 pide un inicio de sesión seguro del administrador. El administrador es **una sola persona** (supuesto de la fase 2) y la autenticación de visitantes está fuera del alcance.
- El proyecto lo mantiene una persona: cada flujo de seguridad propio (registro, recuperación, almacenamiento de contraseñas) es código que mantener y superficie de ataque.

## Decisión

**Entrar con GitHub y lista de permitidos** (decisión 10 de [05 §2](../architecture/05-arquitectura-tecnica.md)).

- La API acepta un único inicio de sesión de GitHub, indicado por una variable de entorno (`ADMIN_GITHUB_LOGIN`). Por eso desaparece la tabla `admin_user` ([05 §3](../architecture/05-arquitectura-tecnica.md)).
- Tras la Fase 0, la comprobación compara el `login` **y** el `id` numérico de la cuenta con la lista de permitidos; la implementación del flujo OAuth es un adaptador propio (ADR-015) y la sesión es una cookie firmada (ADR-012).

## Alternativas consideradas

- **Correo y contraseña.** Descartada: obliga a guardar contraseñas y a construir su recuperación.
- **Enlace mágico.** Descartada. Obligaría a enviar un correo en cada inicio de sesión, lo que hace depender la entrada al panel de Resend y de su cupo de 100 correos al día. Con GitHub, el único tercero es el proveedor de identidad, que ya se usa. Es un argumento de diseño de Anderson (2026-10-24), no un dato medido.

## Consecuencias

**Positivas**
- Sin contraseñas que guardar ni recuperación que construir; menor superficie de ataque.
- Sin tabla de usuarios: el modelo de datos pierde una tabla.

**Negativas**
- Dependencia de la disponibilidad de GitHub y de la cuenta personal de Anderson para entrar al panel.
- Requiere implementar OAuth con cuidado (`state`, PKCE, comprobación de la cuenta): ver ADR-015.
- RNF-06 ([02-requirements](../requirements/02-requirements.md)) pedía «hash de contraseñas». Se actualizó el 2026-10-24: sin contraseñas propias, con acceso mediante GitHub y lista de permitidos.

## Cuándo revisarla

- Si hay más de un administrador o se necesitan roles.
- Si GitHub cambia su oferta de OAuth Apps de forma que el adaptador deje de ser viable.

## Fuentes

- [docs/architecture/05-arquitectura-tecnica.md](../architecture/05-arquitectura-tecnica.md) (§2 decisión 10, §3)
- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§2.4)
- [docs/requirements/02-requirements.md](../requirements/02-requirements.md) (RF-11, RNF-06, supuestos)
- GitHub, autorización de OAuth Apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps (consultada el 2026-10-24)
