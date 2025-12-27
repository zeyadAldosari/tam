import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Priority, Status } from 'src/generated/prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
