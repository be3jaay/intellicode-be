import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsString, IsOptional, IsNumber, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateCourseDto {
    @ApiProperty({
        example: 'Course Title',
        description: 'The title of the course',
    })
    @IsString()
    title: string;
    
    @ApiProperty({
        example: 'Course Description',
        description: 'The description of the course',
    })
    @IsString()
    description: string;
    
    @ApiProperty({
        example: 'Course Category',
        description: 'The category of the course',
    })
    @IsString()
    category: string;
    
    @ApiProperty({
        example: 'https://example.com/thumbnail.jpg',
        description: 'The thumbnail URL of the course (optional if uploading file)',
        required: false,
    })
    @IsOptional()
    @IsString()
    thumbnail?: string;
}

export class CreateCourseWithFileDto {
    @ApiProperty({
        example: 'Course Title',
        description: 'The title of the course',
    })
    @IsString()
    title: string;
    
    @ApiProperty({
        example: 'Course Description',
        description: 'The description of the course',
    })
    @IsString()
    description: string;
    
    @ApiProperty({
        example: 'Course Category',
        description: 'The category of the course',
    })
    @IsString()
    category: string;
    
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Course thumbnail image file (JPEG, PNG, WebP - max 5MB)',
        required: false,
    })
    thumbnail?: Express.Multer.File;
}

export class CreateCourseResponseDto {
    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'The ID of the course',
    })
    @IsString()
    id: string;

    @ApiProperty({
        example: 'Advanced JavaScript',
        description: 'The title of the course',
    })
    @IsString()
    title: string;

    @ApiProperty({
        example: 'Learn advanced JavaScript concepts',
        description: 'The description of the course',
    })
    @IsString()
    description: string;
    
    @ApiProperty({
        example: 'Programming',
        description: 'The category of the course',
    })
    @IsString()
    category: string;
    
    @ApiProperty({
        example: 'https://example.com/thumbnail.jpg',
        description: 'The thumbnail of the course',
    })
    @IsString()
    thumbnail: string;
    
    @ApiProperty({
        example: 'ABC123XYZ789',
        description: 'The invite code of the course',
    })
    @IsString()
    course_invite_code: string;

    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'The instructor ID of the course',
    })
    @IsString()
    instructor_id: string;

    @ApiProperty({
        example: '2024-01-15T10:30:00Z',
        description: 'The created at timestamp of the course',
    })
    @IsDate()
    created_at: Date;

    @ApiProperty({
        example: '2024-01-15T10:30:00Z',
        description: 'The updated at timestamp of the course',
    })
    @IsDate()
    updated_at: Date;
}

export class CourseQueryDto {
    @ApiProperty({
        example: 0,
        description: 'Number of records to skip',
        required: false,
        default: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;

    @ApiProperty({
        example: 10,
        description: 'Number of records to take',
        required: false,
        default: 10,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({
        example: 'Programming',
        description: 'Filter by category',
        required: false,
    })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiProperty({
        example: 'JavaScript',
        description: 'Search by title',
        required: false,
    })
    @IsOptional()
    @IsString()
    search?: string;
}

export class PaginatedCoursesResponseDto {
    @ApiProperty({
        description: 'Array of courses',
        type: [CreateCourseResponseDto],
    })
    data: CreateCourseResponseDto[];

    @ApiProperty({
        example: 100,
        description: 'Total number of courses',
    })
    @IsNumber()
    total: number;

    @ApiProperty({
        example: 0,
        description: 'Number of records skipped',
    })
    @IsNumber()
    offset: number;

    @ApiProperty({
        example: 10,
        description: 'Number of records taken',
    })
    @IsNumber()
    limit: number;

    @ApiProperty({
        example: 10,
        description: 'Total number of pages',
    })
    @IsNumber()
    totalPages: number;

    @ApiProperty({
        example: 1,
        description: 'Current page number',
    })
    @IsNumber()
    currentPage: number;


}

export class CourseQueryByInstructorDto extends PaginatedCoursesResponseDto {
    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'The instructor ID of the course',
    })
    @IsString()
    instructor_id: string;
}
