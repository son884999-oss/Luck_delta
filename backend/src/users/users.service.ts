import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  /** 사주 프로필 저장 → 저장된 사용자(id 포함) 반환. email 있으면 upsert, 없으면 신규. */
  async create(dto: CreateUserDto): Promise<User> {
    if (dto.email) {
      const existing = await this.users.findOne({ where: { email: dto.email } });
      if (existing) {
        Object.assign(existing, {
          nickname: dto.nickname ?? existing.nickname,
          birth: (dto.birth as any) ?? existing.birth,
          natalSaju: (dto.natalSaju as any) ?? existing.natalSaju,
          physical: (dto.physical as any) ?? existing.physical,
          chronicConditions: dto.chronicConditions ?? existing.chronicConditions,
        });
        return this.users.save(existing);
      }
    }
    const u = this.users.create({
      email: dto.email ?? null,
      nickname: dto.nickname ?? null,
      birth: (dto.birth as any) ?? null,
      natalSaju: (dto.natalSaju as any) ?? null,
      physical: (dto.physical as any) ?? null,
      chronicConditions: dto.chronicConditions ?? [],
    });
    return this.users.save(u);
  }
}
