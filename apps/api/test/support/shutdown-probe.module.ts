import { Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';

/** Fixture provider that records the signal handed to onApplicationShutdown. */
@Injectable()
export class ShutdownProbe implements OnApplicationShutdown {
  static readonly signals: (string | undefined)[] = [];

  onApplicationShutdown(signal?: string): void {
    ShutdownProbe.signals.push(signal);
  }
}

@Module({ providers: [ShutdownProbe] })
export class ShutdownProbeModule {}
