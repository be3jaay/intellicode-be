import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodeExecutionRequestDto, CodeExecutionResponseDto } from './dto/code-execution.dto';

interface JDoodleRequest {
  clientId: string;
  clientSecret: string;
  script: string;
  language: string;
  versionIndex: string;
  stdin?: string;
}

interface JDoodleResponse {
  output?: string;
  statusCode?: number;
  memory?: string;
  cpuTime?: string;
  error?: string;
}

@Injectable()
export class CodeService {
  private readonly logger = new Logger(CodeService.name);
  private readonly jdoodleUrl = 'https://api.jdoodle.com/v1/execute';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Map language to JDoodle language and version
   */
  private mapLanguageToJDoodle(language: string): { language: string; versionIndex: string } {
    const languageMap: Record<string, { language: string; versionIndex: string }> = {
      javascript: { language: 'nodejs', versionIndex: '4' },
      typescript: { language: 'nodejs', versionIndex: '4' },
      python: { language: 'python3', versionIndex: '4' },
      c: { language: 'c', versionIndex: '5' },
      cpp: { language: 'cpp17', versionIndex: '1' },
      java: { language: 'java', versionIndex: '4' },
    };

    const mapped = languageMap[language.toLowerCase()];
    if (!mapped) {
      throw new BadRequestException(`Unsupported language: ${language}`);
    }

    return mapped;
  }

  /**
   * Execute code using JDoodle API
   */
  async executeCode(request: CodeExecutionRequestDto): Promise<CodeExecutionResponseDto> {
    try {
      const clientId = this.configService.get<string>('JDOODLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('JDOODLE_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new BadRequestException('JDoodle credentials not configured');
      }

      const { language, versionIndex } = this.mapLanguageToJDoodle(request.language);

      const jdoodleRequest: JDoodleRequest = {
        clientId,
        clientSecret,
        script: request.code,
        language,
        versionIndex,
        stdin: request.stdin || '',
      };

      this.logger.log(`Executing ${request.language} code via JDoodle`);

      const response = await fetch(this.jdoodleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jdoodleRequest),
      });

      if (!response.ok) {
        throw new BadRequestException(`JDoodle API error: ${response.statusText}`);
      }

      const data: JDoodleResponse = await response.json();

      // Check for compilation or runtime errors
      if (data.statusCode && data.statusCode !== 200) {
        return {
          success: false,
          error: data.output || data.error || 'Unknown error occurred',
        };
      }

      // Check if output contains error indicators
      if (data.output) {
        const outputLower = data.output.toLowerCase();
        const hasError =
          outputLower.includes('error') ||
          outputLower.includes('exception') ||
          outputLower.includes('traceback');

        if (hasError) {
          return {
            success: false,
            error: data.output,
            time: data.cpuTime,
            memory: data.memory,
          };
        }
      }

      // Success case
      return {
        success: true,
        output: data.output || '',
        time: data.cpuTime,
        memory: data.memory,
      };
    } catch (error) {
      this.logger.error('Code execution error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        success: false,
        error: error.message || 'Failed to execute code',
      };
    }
  }
}
