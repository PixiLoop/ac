// dto/create-template.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested, IsArray, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateStatus } from '@prisma/client';

export class CreateChecklistTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean = true;

  @IsNumber()
  @IsOptional()
  displayOrder?: number = 1;
}

export class CreateChecklistTemplateSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsOptional()
  displayOrder?: number = 1;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistTemplateItemDto)
  @IsOptional()
  items?: CreateChecklistTemplateItemDto[] = [];
}

export class CreateChecklistTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  hardwareType: string;

  /** Accepts Prisma enum or Job Book display label (e.g. "HD Camera") */
  @IsString()
  @IsNotEmpty()
  hardwareModel: string;

  /** Accepts Prisma enum or Job Book display label (e.g. "Camera & Video") */
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  version?: string = 'v1.0';

  @IsEnum(TemplateStatus)
  @IsOptional()
  status?: TemplateStatus = TemplateStatus.ACTIVE;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistTemplateSectionDto)
  @IsOptional()
  sections?: CreateChecklistTemplateSectionDto[] = [];
}

export class UpdateChecklistTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  hardwareType?: string;

  @IsString()
  @IsOptional()
  hardwareModel?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsEnum(TemplateStatus)
  @IsOptional()
  status?: TemplateStatus;
}

export class AddSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean = true;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}