import { writeFileSync } from 'node:fs';
import { createApp } from '../app.setup.js';
import { parseEnv } from '../config/env.js';
import { buildOpenApiDocument } from './openapi.js';

const OUTPUT = new URL('../../openapi.json', import.meta.url);

/** Never listens; a fixed env keeps the output deterministic and free of secrets. */
async function generate(): Promise<void> {
  const app = await createApp(parseEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }));
  await app.init();
  writeFileSync(OUTPUT, `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`);
  await app.close();
}

generate().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
