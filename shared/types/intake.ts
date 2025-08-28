import type { z } from "zod";
import {
  IntakeSchema,
  ModeEnum,
  ConditionEnum,
  UrgencyEnum,
  ScopeTypeEnum,
  FlightTypeEnum,
  ARCEnum,
  MitigationLevelEnum,
} from "../schema/intake.schema";

export type Intake = z.infer<typeof IntakeSchema>;
export type Mode = z.infer<typeof ModeEnum>;
export type Condition = z.infer<typeof ConditionEnum>;
export type Urgency = z.infer<typeof UrgencyEnum>;
export type ScopeType = z.infer<typeof ScopeTypeEnum>;
export type FlightType = z.infer<typeof FlightTypeEnum>;
export type ARC = z.infer<typeof ARCEnum>;
export type MitigationLevel = z.infer<typeof MitigationLevelEnum>;

// Re-exports for convenience
export {
  IntakeSchema,
  ModeEnum,
  ConditionEnum,
  UrgencyEnum,
  ScopeTypeEnum,
  FlightTypeEnum,
  ARCEnum,
  MitigationLevelEnum,
};
