import { Controller, Get, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Fixture consumer of ConfigService: shows what a feature module would read. */
@Controller('fixtures')
export class ConfigProbeController {
  constructor(private readonly config: ConfigService) {}

  @Get('config')
  read(): { port: unknown; portType: string; nodeEnv: unknown; corsOrigins: unknown } {
    const port = this.config.get<number>('PORT');
    return {
      port,
      portType: typeof port,
      nodeEnv: this.config.get<string>('NODE_ENV'),
      corsOrigins: this.config.get<string[]>('CORS_ALLOWED_ORIGINS'),
    };
  }
}

@Module({ controllers: [ConfigProbeController] })
export class ConfigProbeModule {}
