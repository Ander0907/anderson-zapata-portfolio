## Qué cambia y por qué

<!-- Una o dos frases. Enlaza el RF/RNF o el ADR que lo motiva. -->

## Criterios de aceptación

- [ ] <!-- Criterio, con su RF/RNF (por ejemplo, RF-07) -->

## Pruebas escritas primero (TDD)

| Commit `test:` | Commit de producción | Qué comportamiento fija |
|---|---|---|
| | | |

## Evidencia

- Lint, tipos y pruebas:
- Cobertura (`domain/` y `application/` ≥ 90 %, global ≥ 80 %):

## Revisiones

- [ ] Revisión de código (`nest-code-reviewer`): <!-- veredicto -->
- [ ] Revisión de seguridad (`api-security-auditor`): <!-- veredicto o «no aplica» con motivo -->
- [ ] Auditoría TDD (`tdd-auditor`): <!-- PASS / FAIL -->

## Definición de «hecho» (manual, sección 9)

- [ ] Criterios cumplidos y trazables a RF/RNF
- [ ] Historial rojo → verde → refactor con auditoría TDD aprobada
- [ ] Lint, tipos, pruebas y cobertura en verde en CI
- [ ] Contrato OpenAPI actualizado; migraciones incluidas si hay cambios de datos
- [ ] Documentación actualizada (README, ADR, manual)
- [ ] Sin secretos, sin código muerto, sin TODO sin issue

## Riesgos y pasos manuales

<!-- Lo que queda para Anderson (cuentas, secretos, despliegue) o «ninguno». -->
