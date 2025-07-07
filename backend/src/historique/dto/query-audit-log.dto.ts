import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryAuditLogDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsIn(['CREATE', 'UPDATE', 'DELETE'])
  action?: 'CREATE' | 'UPDATE' | 'DELETE';

  @IsOptional()
  @IsString()
  entity?: string;
}
