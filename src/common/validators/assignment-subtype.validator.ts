import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { AssignmentSubtype } from '../../modules/course/dto/assignment.dto';

@ValidatorConstraint({ name: 'assignmentSubtypeValidation', async: false })
export class AssignmentSubtypeValidationConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const assignmentSubtype = object.assignmentSubtype;

    if (!assignmentSubtype) {
      return true; // Let other validators handle required field validation
    }

    switch (assignmentSubtype) {
      case AssignmentSubtype.code_sandbox:
        // For code_sandbox: questions can be empty array, starterCode can be provided
        return this.validateCodeSandbox(object);
      
      case AssignmentSubtype.quiz_form:
        // For quiz_form: starterCode should be null/undefined
        return this.validateQuizForm(object);
      
      case AssignmentSubtype.file_upload:
        // For file_upload: starterCode should be null/undefined
        return this.validateFileUpload(object);
      
      default:
        return true;
    }
  }

  private validateCodeSandbox(object: any): boolean {
    // For code_sandbox, questions can be empty array or undefined
    // starterCode can be provided or null/undefined
    return true; // No specific restrictions for code_sandbox
  }

  private validateQuizForm(object: any): boolean {
    // For quiz_form, starterCode should be null/undefined
    if (object.starterCode !== null && object.starterCode !== undefined) {
      return false;
    }
    return true;
  }

  private validateFileUpload(object: any): boolean {
    // For file_upload, starterCode should be null/undefined
    if (object.starterCode !== null && object.starterCode !== undefined) {
      return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any;
    const assignmentSubtype = object.assignmentSubtype;

    switch (assignmentSubtype) {
      case AssignmentSubtype.quiz_form:
        return 'For quiz_form assignments, starterCode must be null or undefined';
      case AssignmentSubtype.file_upload:
        return 'For file_upload assignments, starterCode must be null or undefined';
      default:
        return 'Invalid assignment subtype validation';
    }
  }
}

export function IsValidAssignmentSubtype(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: AssignmentSubtypeValidationConstraint,
    });
  };
}
