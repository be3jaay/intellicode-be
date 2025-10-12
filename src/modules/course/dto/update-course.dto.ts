import { PartialType } from '@nestjs/swagger';
import { CreateCourseDto, CreateCourseResponseDto } from './create-course.dto';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class UpdateCourseResponseDto extends CreateCourseResponseDto {}
