import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';

/**
 * 전역 Redis — 어느 모듈에서나 RedisService 주입 가능.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // 클라우드는 REDIS_URL(redis:// 또는 rediss://) 하나를 준다. 있으면 그걸로 연결.
        const url = config.get<string>('REDIS_URL');
        if (url) return new Redis(url, { maxRetriesPerRequest: 2 });
        return new Redis({
          host: config.get('REDIS_HOST') ?? 'localhost',
          port: parseInt(config.get('REDIS_PORT') ?? '6379', 10),
          maxRetriesPerRequest: 2,
          lazyConnect: false,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
