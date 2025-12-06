import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CodeService } from './code.service';
import { CodeExecutionRequestDto, CodeExecutionResponseDto } from './dto/code-execution.dto';

@ApiTags('code')
@Controller('code')
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute code',
    description:
      'Execute code in various programming languages using JDoodle API. Supports JavaScript, TypeScript, Python, C, C++, and Java.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Code executed successfully',
    type: CodeExecutionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or unsupported language',
  })
  async executeCode(@Body() request: CodeExecutionRequestDto): Promise<CodeExecutionResponseDto> {
    return this.codeService.executeCode(request);
  }
}
