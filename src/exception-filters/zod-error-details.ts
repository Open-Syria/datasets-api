import { ZodError } from 'zod';

export function getZodValidationDetails(error: unknown) {
  if (!(error instanceof ZodError)) {
    return [];
  }

  return error.issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    property: issue.path.join('.') || undefined,
  }));
}
