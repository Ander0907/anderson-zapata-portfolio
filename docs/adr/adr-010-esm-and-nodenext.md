# ADR-010: ESM y NodeNext en todo el monorepo

**Estado:** Aceptado · **Fecha:** 2026-10-24 · **Decisores:** Anderson Zapata

## Contexto

- NestJS 12: todos los paquetes del núcleo son ESM; CJS sigue funcionando gracias a `require(esm)`, y `nest new` pregunta entre CJS y ESM. **Los proyectos ESM usan Vitest por defecto** (los CJS, Jest).
- Prisma 7 trata ESM como camino principal: no necesita configuración, mientras que en CJS hay que poner `moduleFormat = "cjs"`.
- Next.js también usa ESM.
- Requisitos de Node: Nest 12 pide Node ≥ 20.19 o ≥ 22.12 para ejecutar; su CLI pide Node 22.22.3+, 24.15+ o 26+. Prisma 7 pide Node ≥ 20.19.

## Decisión

**ESM y NodeNext en todo el monorepo** ([backend-research-definition §3.1](../architecture/backend-research-definition.md), regla D2):

- `"type": "module"` en los paquetes.
- `module` y `moduleResolution: "NodeNext"` en TypeScript.
- Imports relativos con extensión `.js`.
- **Node 22 LTS (≥ 22.12)** en local, CI y Docker.
- Vitest 5 como runner. La inyección por tipo de Nest funciona sin `unplugin-swc` (verificado el 2026-10-24: Vitest 5.0.5 usa Vite 8 (Rolldown + Oxc), que emite los metadatos de decoradores a partir de `emitDecoratorMetadata` del `tsconfig`; no hace falta `unplugin-swc`. La prueba `apps/api/src/common/di/constructor-injection.spec.ts` falla si se desactiva esa opción y pasa con ella; ver ADR-018).

## Alternativas consideradas

- **CommonJS con `moduleFormat = "cjs"` en Prisma.** Descartada: funciona, pero rema contra los valores por defecto de Nest 12, Prisma 7 y Next.js.
- **Mezcla (ESM en la web, CJS en la API).** Descartada implícitamente por la decisión «en todo el monorepo»: `packages/shared` lo consumen ambas aplicaciones.

## Nota de implementación (2026-10-24, rama `chore/monorepo-skeleton`)

- **Compilación de `packages/shared`:** se compila a `dist` con `tsc`. Cada subruta de `exports` tiene tres entradas: `@portfolio/source` (el `.ts` de `src`), `types` (el `.d.ts` de `dist`) y `default` (el `.js` de `dist`).
- La API activa la condición `@portfolio/source` solo para desarrollo y pruebas: `customConditions` en `apps/api/tsconfig.json` (no en `tsconfig.build.json`), y `resolve.conditions` y `ssr.resolve.conditions` en `apps/api/vitest.config.ts`. En ejecución, Node usa lo compilado.
- `pnpm build` (`pnpm -r build`) compila `shared` antes que la API.
- Alternativas descartadas: exportar `.ts` sin compilar (rompe el build de la API por `rootDir` y obligaría a ejecutar TypeScript en producción) y project references de TypeScript (más configuración para el mismo resultado).
- Node fijado en `.nvmrc` a 22.23.4.

## Consecuencias

**Positivas**
- Se siguen los caminos por defecto de las herramientas, con menos configuración.
- Un único formato de módulos para `packages/shared`.

**Negativas**
- Imports relativos con `.js` en código TypeScript, algo poco intuitivo.
- La inyección por tipo depende de `emitDecoratorMetadata` en `tsconfig.base.json`: si se desactiva, Nest deja de resolver dependencias. Al cambiar el `tsconfig` en local hay que borrar `node_modules/.vitest-cache`, porque la caché de Vitest no se invalida sola (riesgo G7 resuelto).
- Algunas librerías antiguas pueden no comportarse bien en ESM: se comprueba antes de añadirlas.

## Cuándo revisarla

- Si una dependencia imprescindible no funciona en ESM.
- Si Node 22 deja de ser LTS o la CLI de Nest exige otra versión.

## Fuentes

- [docs/architecture/backend-research-definition.md](../architecture/backend-research-definition.md) (§3.1, §3.4 D2, §3.7)
- [docs/architecture/backend-research.md](../architecture/backend-research.md) (§1.1, §1.2, §1.3, §A, D2)
- NestJS, guía de migración: https://docs.nestjs.com/migration-guide · receta de Prisma: https://docs.nestjs.com/recipes/prisma · receta SWC: https://docs.nestjs.com/recipes/swc (consultadas el 2026-10-24)
- Prisma, actualización a v7: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 (consultada el 2026-10-24)
