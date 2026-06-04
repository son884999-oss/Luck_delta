import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * 얇은 Redis 래퍼 — 사용자 쿼리 캐시(천문식탁 분석 결과, 오늘의 추천).
 * 캐시 적중 시 외부 API/무거운 연산을 우회해 zero-latency 응답.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly ttl: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis,
    config: ConfigService,
  ) {
    this.ttl = parseInt(config.get('CACHE_TTL_SECONDS') ?? '86400', 10);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds ?? this.ttl);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** 캐시-어사이드 헬퍼: 적중 시 반환, 미스 시 loader 실행 후 저장 */
  async wrap<T>(key: string, loader: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    const fresh = await loader();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
