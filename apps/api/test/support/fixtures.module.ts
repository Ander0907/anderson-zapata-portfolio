import {
  BadRequestException,
  Body,
  ForbiddenException,
  Param,
  UnauthorizedException,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  Module,
  NotFoundException,
  Post,
  Res,
} from '@nestjs/common';
import { z } from 'zod';

/** Fixture-registered validation codes follow the ^[A-Z][A-Z0-9_]*$ convention (spec A6). */
export const fixtureItemSchema = z.strictObject({
  name: z.string().min(1, 'NAME_REQUIRED').max(5, 'NAME_TOO_LONG'),
  email: z.email(),
  tags: z.array(z.string()).optional(),
  'a/b~c': z.string().optional(),
});

@Controller('fixtures')
export class FixtureController {
  private readonly logger = new Logger('Fixture');

  @Get('ping')
  ping(): { pong: true } {
    return { pong: true };
  }

  @Get('boom')
  boom(): never {
    throw new Error('internal-secret-detail');
  }

  @Get('leaky-500')
  leaky500(): never {
    throw new InternalServerErrorException('leaky-client-visible-text');
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundException('missing');
  }

  @Get('bad-request')
  badRequest(): never {
    throw new BadRequestException('bad');
  }

  @Get('unauthorized')
  unauthorized(): never {
    throw new UnauthorizedException('no');
  }

  @Get('forbidden')
  forbidden(): never {
    throw new ForbiddenException('no');
  }

  @Get('log-level/:level')
  logLevel(@Param('level') level: string): { ok: true } {
    const marker = { marker: `level-${level}` };
    const logger = this.logger;
    const emit: Record<string, () => void> = {
      trace: () => logger.verbose(marker),
      debug: () => logger.debug(marker),
      info: () => logger.log(marker),
      warn: () => logger.warn(marker),
      error: () => logger.error(marker),
      fatal: () => logger.fatal(marker),
    };
    emit[level]?.();
    return { ok: true };
  }

  @Get('write-then-throw')
  writeThenThrow(@Res() res: { write(chunk: string): void }): never {
    res.write('partial-body');
    throw new Error('after-write-secret');
  }

  @Get('teapot')
  teapot(): never {
    throw new HttpException('short and stout', 418);
  }

  @Get('with-error-code')
  withErrorCode(): never {
    // A catalogue code different from the one the status alone would give (400 -> BAD_REQUEST).
    throw new HttpException('invalid', 400, { errorCode: 'VALIDATION_INVALID' });
  }

  @Get('unknown-error-code')
  unknownErrorCode(): never {
    throw new HttpException('conflict', 409, { errorCode: 'NOT_IN_THE_CATALOGUE' });
  }

  @Get('log-personal')
  logPersonal(): { ok: true } {
    this.logger.log({
      marker: 'personal-log-marker',
      name: 'Ana Personal',
      email: 'ana@personal.example',
      message: 'private-message-text',
    });
    return { ok: true };
  }

  @Get('set-cookie')
  setCookie(@Res({ passthrough: true }) res: { setHeader(name: string, value: string): void }): {
    ok: true;
  } {
    res.setHeader('set-cookie', 'sid=response-cookie-secret; HttpOnly');
    return { ok: true };
  }

  @Post('raw')
  raw(@Body() body: unknown): unknown {
    return { received: body };
  }

  @Post('items')
  create(@Body({ schema: fixtureItemSchema }) body: z.infer<typeof fixtureItemSchema>): unknown {
    return { created: body };
  }
}

@Module({ controllers: [FixtureController] })
export class FixtureModule {}
