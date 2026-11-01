import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * `req.ip` honours `trust proxy` (one hop), so it is the entry added by our own proxy.
 * Never `req.ips[0]`: the leftmost X-Forwarded-For entry is chosen by the client.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: { ip: string }): Promise<string> {
    return Promise.resolve(req.ip);
  }
}
