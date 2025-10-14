import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LessonType } from '@prisma/client';

export class CreateLessonDto {
  @ApiProperty({ description: 'Lesson title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Lesson description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Lesson content (markdown/rich text)', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ enum: LessonType, description: 'Lesson type' })
  @IsEnum(LessonType)
  @IsOptional()
  lesson_type?: LessonType = LessonType.content;

  @ApiProperty({ description: 'Order index within the module' })
  @IsInt()
  order_index: number;

  @ApiProperty({ description: 'Whether lesson is published', required: false })
  @IsBoolean()
  @IsOptional()
  is_published?: boolean = false;
}

export class BulkCreateLessonsDto {
  @ApiProperty({ description: 'Module ID' })
  @IsString()
  @IsNotEmpty()
  module_id: string;

  @ApiProperty({ 
    type: [CreateLessonDto], 
    description: 'Array of lessons to create' 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonDto)
  lessons: CreateLessonDto[];
}

export class LessonResponseDto {
  @ApiProperty({ description: 'Lesson ID' })
  id: string;

  @ApiProperty({ description: 'Module ID' })
  module_id: string;

  @ApiProperty({ description: 'Lesson title' })
  title: string;

  @ApiProperty({ description: 'Lesson description' })
  description?: string;

  @ApiProperty({ description: 'Lesson content' })
  content?: string;

  @ApiProperty({ enum: LessonType, description: 'Lesson type' })
  lesson_type: LessonType;

  @ApiProperty({ description: 'Order index' })
  order_index: number;

  @ApiProperty({ description: 'Is published' })
  is_published: boolean;

  @ApiProperty({ description: 'Created date' })
  created_at: Date;

  @ApiProperty({ description: 'Updated date' })
  updated_at: Date;

  @ApiProperty({ description: 'Module information', required: false })
  module?: {
    id: string;
    title: string;
    description?: string;
  };

  @ApiProperty({ description: 'Activities in this lesson' })
  activities?: any[];
}
