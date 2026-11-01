import { Body, Controller, Module, Post } from '@nestjs/common';
import { z } from 'zod';

/** Throwaway schema for the OpenAPI converter test; never reaches the committed openapi.json. */
export const openApiFixtureSchema = z.strictObject({
  title: z.string().min(1).max(50),
  note: z.string().max(200).optional(),
  tags: z.array(z.strictObject({ label: z.string().max(20) })).max(5),
});

@Controller('fixtures')
export class OpenApiFixtureController {
  @Post('openapi-items')
  create(@Body({ schema: openApiFixtureSchema }) body: z.infer<typeof openApiFixtureSchema>) {
    return { created: body };
  }
}

@Module({ controllers: [OpenApiFixtureController] })
export class OpenApiFixtureModule {}
