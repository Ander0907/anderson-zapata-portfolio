# ADR-015: Adaptador propio de OAuth con GitHub

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- Solo Anderson debe poder entrar al panel, con su cuenta de GitHub (ADR-007).
- Las librerías conocidas no son una base fiable: **Arctic está deprecado desde julio de 2026** (npm 3.7.0) y **`passport-github2` 0.1.12 lleva sin cambios desde 2020**.
- GitHub soporta **PKCE (solo S256)** en OAuth Apps desde el 14 de julio de 2025.
- El flujo son pocos pasos bien definidos: redirigir a GitHub con `state` y PKCE, canjear el código, leer el usuario y comprobar que es la cuenta permitida.

## Decisión

Un **adaptador propio** de unas 80 líneas, con `fetch` nativo, detrás del puerto **`GithubOAuthClient`** ([backend-research-definition §2.4](../architecture/backend-research-definition.md)), con las operaciones `buildAuthorizeUrl(state, codeChallenge)`, `exchangeCode(code, verifier)` y `fetchUser(token)` ([backend-research §1.7](../architecture/backend-research.md)). El caso de uso `CompleteGithubLogin` orquesta el flujo (hexagonal ligera, ADR-017).

- Permisos mínimos (ninguno o `read:user`); el token de GitHub **se descarta** tras leer el usuario, no se guarda.
- La comprobación compara el `login` **y** el `id` numérico de la cuenta con la lista de permitidos.
- Las respuestas de GitHub que se usan se validan con Zod; toda llamada tiene tiempo máximo (D6).

**Condiciones obligatorias:**
1. Pruebas escritas primero que cubran un `state` falso, un PKCE incorrecto, una cuenta que no es la permitida y un token inválido.
2. **Revisión de seguridad con el modelo más capaz** antes de fusionar.
3. Contraste con el OWASP API Security Top 10 (edición 2023) y con los capítulos de OAuth y sesión de ASVS 5.0.

## Alternativas consideradas

- **Arctic.** Descartada: deprecado desde julio de 2026.
- **`passport-github2` con `@nestjs/passport`.** Descartada: sin publicaciones desde 2020; además Passport está en la lista de patrones descartados (más código y superficie que un adaptador y una cookie HMAC).

## Consecuencias

**Positivas**
- Código pequeño, sin dependencias abandonadas, y reemplazable gracias al puerto.
- Pruebas sin red mediante un doble del puerto.

**Negativas**
- Código de seguridad propio: el riesgo de error recae en el proyecto, de ahí las condiciones obligatorias.
- Cambios en la API de OAuth de GitHub hay que seguirlos a mano.

## Cuándo revisarla

- Si aparece una librería mantenida, pequeña y compatible con Nest 12 que cubra PKCE.
- Si GitHub cambia el flujo de OAuth Apps.

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§2.4, §3.2)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§0, §1.4, §1.7, §C)
- GitHub, PKCE: https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/ · autorización de OAuth Apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps (consultadas el 2026-10-24)
- Arctic (deprecado): https://arctic.pilcrowonpaper.com/ (consultada el 2026-10-24)
- OWASP API Security Top 10: https://api-security.owasp.org/ · ASVS: https://asvs.owasp.org/ (consultadas el 2026-10-24)
