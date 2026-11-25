import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export enum CommissionScopeDto {
  GLOBAL = "GLOBAL",
  PLAN = "PLAN",
  TENANT = "TENANT",
  COURSE = "COURSE",
}

export enum CommissionTypeDto {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
}

export class SetCommissionRuleDto {
  @ApiProperty({ enum: CommissionScopeDto })
  @IsEnum(CommissionScopeDto)
  scope!: CommissionScopeDto;

  @ApiProperty({ enum: CommissionTypeDto })
  @IsEnum(CommissionTypeDto)
  type!: CommissionTypeDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentRate?: number;

  @ApiProperty({ required: false, example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;
}
