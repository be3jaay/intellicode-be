import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateModuleDto {
  @ApiProperty({ description: 'Module title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Module description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Course ID' })
  @IsUUID()
  @IsNotEmpty()
  course_id: string;

  @ApiProperty({ description: 'Order index', required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  order_index?: number;

  @ApiProperty({ description: 'Is published', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  is_published?: boolean;
}

export class UpdateModuleDto {
  @ApiProperty({ description: 'Module title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Module description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Order index', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  order_index?: number;

  @ApiProperty({ description: 'Is published', required: false })
  @IsBoolean()
  @IsOptional()
  is_published?: boolean;
}

export class ModuleResponseDto {
  @ApiProperty({ description: 'Module ID' })
  id: string;

  @ApiProperty({ description: 'Module title' })
  title: string;

  @ApiProperty({ description: 'Module description' })
  description?: string;

  @ApiProperty({ description: 'Course ID' })
  course_id: string;

  @ApiProperty({ description: 'Order index' })
  order_index: number;

  @ApiProperty({ description: 'Is published' })
  is_published: boolean;

  @ApiProperty({ description: 'Created at' })
  created_at: Date;

  @ApiProperty({ description: 'Updated at' })
  updated_at: Date;

  @ApiProperty({ description: 'Course information', required: false })
  course?: {
    id: string;
    title: string;
    description: string;
  };

  @ApiProperty({ description: 'Lessons count', required: false })
  lessons_count?: number;

  @ApiProperty({ description: 'Files count', required: false })
  files_count?: number;
}

export class ModuleQueryDto {
  @ApiProperty({ description: 'Number of records to skip', required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @ApiProperty({ description: 'Number of records to take', required: false, default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ description: 'Filter by published status', required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_published?: boolean;

  @ApiProperty({ description: 'Search by title', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}

export class PaginatedModulesResponseDto {
  @ApiProperty({ description: 'Array of modules' })
  modules: ModuleResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page offset' })
  offset: number;

  @ApiProperty({ description: 'Current page limit' })
  limit: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrevious: boolean;
}

export class BulkCreateModulesDto {
  @ApiProperty({ description: 'Course ID' })
  @IsUUID()
  @IsNotEmpty()
  course_id: string;

  @ApiProperty({
    description: 'Array of modules to create',
    type: [CreateModuleDto],
  })
  @IsNotEmpty()
  modules: Omit<CreateModuleDto, 'course_id'>[];
}

export class BulkCreateModuleItemDto {
  @ApiProperty({ description: 'Module title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Module description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Order index', required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  order_index?: number;

  @ApiProperty({ description: 'Is published', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  is_published?: boolean;
}

export class LessonSummaryDto {
  @ApiProperty({ description: 'Lesson ID' })
  id: string;

  @ApiProperty({ description: 'Lesson title' })
  title: string;

  @ApiProperty({ description: 'Lesson description' })
  description?: string;

  @ApiProperty({ description: 'Order index' })
  order_index: number;

  @ApiProperty({ description: 'Is published' })
  is_published: boolean;

  @ApiProperty({ description: 'Lesson difficulty' })
  difficulty: string;

  @ApiProperty({ description: 'Estimated duration in minutes' })
  estimated_duration?: number;

  @ApiProperty({ description: 'Lesson tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Created date' })
  created_at: Date;

  @ApiProperty({ description: 'Updated date' })
  updated_at: Date;
}

export class ModuleListItemDto {
  @ApiProperty({ description: 'Module ID' })
  id: string;

  @ApiProperty({ description: 'Module title' })
  title: string;

  @ApiProperty({ description: 'Module description' })
  description?: string;

  @ApiProperty({ description: 'Date created' })
  created_at: Date;

  @ApiProperty({ description: 'Date updated' })
  updated_at: Date;

  @ApiProperty({ description: 'Number of lessons' })
  lessons_count: number;

  @ApiProperty({ description: 'Number of activities' })
  activities_count: number;

  @ApiProperty({ description: 'Lessons in this module', type: [LessonSummaryDto] })
  lessons: LessonSummaryDto[];
}

export class ModuleListQueryDto {
  @ApiProperty({ description: 'Number of records to skip', required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @ApiProperty({ description: 'Number of records to take', required: false, default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ description: 'Search by title or description', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}

export class PaginatedModuleListResponseDto {
  @ApiProperty({ description: 'Array of modules', type: [ModuleListItemDto] })
  modules: ModuleListItemDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page offset' })
  offset: number;

  @ApiProperty({ description: 'Current page limit' })
  limit: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrevious: boolean;
}
