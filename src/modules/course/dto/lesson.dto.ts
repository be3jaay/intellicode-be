import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsInt, IsArray, ValidateNested, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

// Add new enum for lesson difficulty
export enum LessonDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

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

  @ApiProperty({ description: 'Order index within the module' })
  @IsInt()
  order_index: number;

  @ApiProperty({ description: 'Whether lesson is published', required: false })
  @IsBoolean()
  @IsOptional()
  is_published?: boolean = false;

  @ApiProperty({ enum: LessonDifficulty, description: 'Lesson difficulty level', required: false })
  @IsEnum(LessonDifficulty)
  @IsOptional()
  difficulty?: LessonDifficulty = LessonDifficulty.BEGINNER;

  @ApiProperty({ description: 'Estimated duration in minutes', required: false })
  @IsNumber()
  @IsOptional()
  estimated_duration?: number;

  @ApiProperty({ description: 'Lesson tags', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] = [];
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

export class BulkCreateLessonsFromObjectDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  @IsNotEmpty()
  course_id: string;

  @ApiProperty({ description: 'Module ID' })
  @IsString()
  @IsNotEmpty()
  module_id: string;

  @ApiProperty({ 
    description: 'Object containing lessons with numeric keys',
    example: {
      "0": { 
        title: "Lesson 1", 
        description: "Desc 1", 
        content: "Content 1", 
        order: 1,
        difficulty: "beginner",
        estimatedDuration: 25,
        isPublished: true,
        tags: ["javascript", "react"]
      }
    }
  })
  @IsObject()
  lessons: Record<string, {
    title: string;
    description?: string;
    content?: string;
    order: number;
    difficulty?: string;
    estimatedDuration?: number;
    isPublished?: boolean;
    tags?: string[];
  }>;
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


  @ApiProperty({ description: 'Order index' })
  order_index: number;

  @ApiProperty({ description: 'Is published' })
  is_published: boolean;

  @ApiProperty({ enum: LessonDifficulty, description: 'Lesson difficulty' })
  difficulty: LessonDifficulty;

  @ApiProperty({ description: 'Estimated duration in minutes' })
  estimated_duration?: number;

  @ApiProperty({ description: 'Lesson tags', type: [String] })
  tags: string[];

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
