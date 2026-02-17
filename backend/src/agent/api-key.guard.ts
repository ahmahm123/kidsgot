import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, TooManyRequestsException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-api-key'];
    if (!key || typeof key !== 'string') throw new UnauthorizedException('Missing API key');

    const bucket = `rate:${createHash('sha1').update(key).digest('hex')}`;
    const n = await redis.incr(bucket);
    if (n === 1) await redis.expire(bucket, 60);
    if (n > 120) throw new TooManyRequestsException('Rate limit exceeded');

    const hash = createHash('sha256').update(key).digest('hex');
    const agent = await this.prisma.agentClient.findUnique({ where: { apiKeyHash: hash } });
    if (!agent || agent.status !== 'ACTIVE') throw new UnauthorizedException('Invalid API key');
    req.agent = agent;
    return true;
  }
}
