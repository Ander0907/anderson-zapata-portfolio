# ADR-012: Sesión firmada, caducidad y revocación

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- Un solo administrador entra con GitHub (ADR-007, ADR-015). La API no guarda sesiones en memoria (ADR-008) ni hay tabla de sesiones.
- La hoja de OWASP sobre sesiones recomienda `Secure`, `HttpOnly`, `SameSite=Strict` (preferido) o `Lax` y el prefijo `__Host-`; un timeout absoluto de 4–8 h en apps de bajo riesgo; y advierte que «borrar la cookie no invalida una copia robada». **No cubre las sesiones sin estado**, así que hace falta una estrategia de revocación propia (riesgo G3).
- El panel comparte origen con la API a través de Cloudflare (ADR-011), lo que permite `SameSite=Strict`.

## Decisión

**Cookie de sesión firmada con HMAC**, sin estado en servidor ([backend-research-definition §3.5](../architecture/backend-research-definition.md); detalle en [backend-research §1.7](../architecture/backend-research.md)):

- Payload `{ sub: githubId, login, iat, exp }`, firmado con HMAC-SHA256 de `node:crypto`. `SESSION_SECRET` de al menos 32 bytes, en Secret Manager.
- Puerto `SessionCodec` (unas 40 líneas), probado con un reloj inyectado (`Clock`).
- **Caducidad:** límite absoluto de **8 horas**, con renovación solo por actividad.
- **Revocación:** rotar `SESSION_SECRET` en Secret Manager cierra **todas** las sesiones. Con un solo administrador es suficiente.
- **CSRF, tres defensas juntas:** (1) cookie `__Host-`, `Secure`, `HttpOnly` y `SameSite=Strict`, emitida **en** el retorno de GitHub (la cookie del `state`/PKCE puede ser `Lax`); (2) guard de origen en toda orden que cambia datos; (3) cabecera obligatoria en las llamadas del panel, que fuerza la comprobación previa del navegador. Ningún GET cambia estado (D7).
- Guard de sesión global «cerrado por defecto» con `@Public()` explícito (D8) y una prueba que exige 401 sin sesión en todo `/v1/admin/**` (D9).

## Alternativas consideradas

- **JWT o una librería de sesiones.** Descartada: una cookie HMAC propia es menos código y menos superficie (JWT y Passport están en la lista de patrones descartados).
- **Registro de sesiones en base de datos.** Descartada por ahora; queda como mejora futura si se necesitara revocar sesiones individuales.
- **Doble envío firmado (token CSRF).** Alternativa reservada para el caso en que la decisión de dominio obligara a `SameSite=None`.

## Consecuencias

**Positivas**
- Sin almacenamiento de sesiones; coherente con una sola instancia que escala a cero.
- Protección CSRF en profundidad con poco código.

**Negativas**
- No se puede expulsar una sola sesión robada: la revocación es global (rotar el secreto) o por caducidad.
- Código criptográfico propio, aunque pequeño: exige pruebas y revisión de seguridad.

## Cuándo revisarla

- Si hay más de un administrador o hace falta revocar sesiones individuales.
- Si se abandona el dominio único y la cookie pasa a ser cross-site (ADR-011).

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§3.2, §3.4, §3.5, §6 G3)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§1.4, §1.7, §B)
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html (consultada el 2026-10-24)
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html (consultada el 2026-10-24)
