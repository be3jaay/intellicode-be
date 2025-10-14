import { NotFoundException } from '@nestjs/common';

export class UuidValidator {
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  static validate(id: string, fieldName: string = 'ID'): boolean {
    if (!this.UUID_REGEX.test(id)) {
      throw new NotFoundException(`Invalid ${fieldName} format: ${id}`);
    }
    return true;
  }

  static validateMultiple(ids: { [key: string]: string }): boolean {
    for (const [fieldName, id] of Object.entries(ids)) {
      this.validate(id, fieldName);
    }
    return true;
  }
}
