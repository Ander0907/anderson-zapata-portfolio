import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

/**
 * Liveness endpoint for uptime checks, at `/health` with no version prefix.
 *
 * It has no service and never touches the database, so checks do not keep Neon awake (ADR-016).
 * The global rate limit applies to it.
 */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  /**
   * Reports that the process answers HTTP requests; it says nothing about the database.
   *
   * @returns A constant `ok` status.
   */
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
