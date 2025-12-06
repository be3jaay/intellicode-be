import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class CodeExecutionRequestDto {
  @ApiProperty({
    description: 'The source code to execute',
    example: 'console.log("Hello, World!");',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Programming language',
    example: 'javascript',
    enum: ['javascript', 'python', 'c', 'cpp', 'java', 'typescript'],
  })
  @IsString()
  @IsIn(['javascript', 'python', 'c', 'cpp', 'java', 'typescript'])
  language: string;

  @ApiProperty({
    description: 'Standard input for the program (optional)',
    example: 'Alice',
    required: false,
  })
  @IsString()
  @IsOptional()
  stdin?: string;
}

export class CodeExecutionResponseDto {
  @ApiProperty({
    description: 'Whether the execution was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Program output',
    example: 'Hello, World!',
    required: false,
  })
  output?: string;

  @ApiProperty({
    description: 'Error message if execution failed',
    example: 'SyntaxError: Unexpected token',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'CPU time used in seconds',
    example: '0.05',
    required: false,
  })
  time?: string;

  @ApiProperty({
    description: 'Memory used',
    example: '1024',
    required: false,
  })
  memory?: string;
}
