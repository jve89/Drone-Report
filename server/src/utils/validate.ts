// server/src/utils/validate.ts
import { IntakeSchema, type Intake } from "@drone-report/shared/schema/intake.schema";

export class ValidationError extends Error {
  status = 400;
  constructor(public issues: string[]) {
    super(`Invalid intake: ${issues.join("; ")}`);
  }
}

/**
 * Validate incoming intake payload against the shared Zod schema.
 * Throws ValidationError (status=400) if invalid.
 */
export function validateIntake(payload: unknown): Intake {
  const parsed = IntakeSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
    throw new ValidationError(issues);
  }
  return parsed.data;
}
