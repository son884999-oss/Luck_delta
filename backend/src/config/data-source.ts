import 'reflect-metadata';
import { DataSource, DataSourceOptions, LogLevel } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { User } from '../entities/user.entity';
import { FoodNutrition } from '../entities/food-nutrition.entity';
import { HealthFunctionalItem } from '../entities/health-functional-item.entity';
import { DailyOhaengLog } from '../entities/daily-ohaeng-log.entity';

loadEnv();

// 클라우드(Railway/Render 등)는 보통 DATABASE_URL 하나를 준다. 있으면 그걸 우선 사용.
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
const logging: LogLevel[] = process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];
const common = {
  type: 'postgres' as const,
  entities: [User, FoodNutrition, HealthFunctionalItem, DailyOhaengLog],
  migrations: ['dist/migrations/*.js'],
  // 운영 첫 배포 편의를 위해 기본 동기화 ON(DB_SYNCHRONIZE=false로 끌 수 있음)
  synchronize: process.env.DB_SYNCHRONIZE !== 'false',
  logging,
};

export const dataSourceOptions: DataSourceOptions = process.env.DATABASE_URL
  ? { ...common, url: process.env.DATABASE_URL, ssl }
  : {
      ...common,
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER ?? 'chunmun',
      password: process.env.DB_PASSWORD ?? 'chunmun_pw',
      database: process.env.DB_NAME ?? 'chunmun',
      ssl,
    };

// TypeORM CLI(migration:generate/run)용 기본 export
export default new DataSource(dataSourceOptions);
