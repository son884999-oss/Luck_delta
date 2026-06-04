import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

/** 사용자 — 앱에서 사주 프로필을 등록하고 id를 받아 추천/분석 호출에 사용 */
@ApiTags('사용자 (Users)')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiOperation({ summary: '사주 프로필 등록 — 저장 후 userId 반환' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }
}
