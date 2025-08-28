import { IntakeSchema, type Intake } from "@drone-report/shared/dist/schema/intake.schema";

/**
 * Validate incoming intake payload against the shared Zod schema.
 * Throws 400-style error object if invalid.
 */
export function validateIntake(payload: unknown): Intake {
  const parsed = IntakeSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
    const error = new Error(`Invalid intake: ${issues.join("; ")}`);
    // @ts-expect-error augment
    error.status = 400;
    throw error;
  }
  return parsed.data;
}
