import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

/** 앱에서 사주 프로필을 등록할 때 보내는 본문 (natalSaju는 프런트 saju.js가 계산해 전달) */
export class CreateUserDto {
  @IsOptional() @IsString()
  email?: string;

  @IsOptional() @IsString()
  nickname?: string;

  @IsOptional() @IsObject()
  birth?: { y: number; m: number; d: number; h: number | null; min: number | null };

  @IsOptional() @IsObject()
  natalSaju?: Record<string, unknown>;

  @IsOptional() @IsObject()
  physical?: Record<string, unknown>;

  @IsOptional() @IsArray()
  chronicConditions?: string[];
}
