import { z } from "zod";

/** Basic enums */
export const ModeEnum = z.enum(["easy", "advanced"]);
export const ConditionEnum = z.enum(["Excellent", "Good", "Fair", "Poor"]);
export const UrgencyEnum = z.enum(["None", "Low", "Medium", "High", "Critical"]);
export const ScopeTypeEnum = z.enum(["Roof", "Facade", "Solar", "Insurance", "Progress", "Other"]);
export const FlightTypeEnum = z.enum(["Manual", "Automated"]);
export const ARCEnum = z.enum(["ARC-a", "ARC-b", "ARC-c", "ARC-d"]);
export const MitigationLevelEnum = z.enum(["none", "low", "medium", "high"]);
export const TierEnum = z.enum(["raw", "full"]); // NEW

/** Reusable primitives */
const UrlStr = z.string().url();
const EmailStr = z.string().email();
const PhoneStr = z.string().min(3).max(50).optional();
const HexColor = z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional();

/** Contact / operator */
export const ContactSchema = z.object({
  email: EmailStr,
  project: z.string().min(1),
  company: z.string().min(1),
  name: z.string().optional(), // contact name
  phone: PhoneStr,
});

export const OperatorSchema = z.object({
  registration: z.string().min(1).optional(), // UAS operator registration number
  name: z.string().optional(),
  responsibleContact: z.object({
    name: z.string().optional(),
    email: EmailStr.optional(),
    phone: PhoneStr,
  }).optional(),
});

export const AuthorisationSchema = z.object({
  number: z.string().optional(),
  expires: z.string().optional(), // ISO date
});

/** Site / inspection */
export const SiteSchema = z.object({
  address: z.string().optional(),
  country: z.string().optional(),
  mapImageUrl: UrlStr.optional(), // uploaded map image
});

export const InspectionSchema = z.object({
  date: z.string().min(4), // ISO date (YYYY-MM-DD acceptable)
  time: z.string().optional(),
});

export const WeatherSchema = z.object({
  tempC: z.number().optional(),
  windMs: z.number().optional(),
  precip: z.string().optional(), // none/light/moderate/etc.
  cloud: z.string().optional(),  // few/scattered/broken/overcast
});

export const FlightSchema = z.object({
  type: FlightTypeEnum.optional(),
  altitudeMinM: z.number().optional(),
  altitudeMaxM: z.number().optional(),
  airtimeMin: z.number().optional(),
  crewCount: z.number().optional(),
});

export const ConstraintsSchema = z.object({
  heightLimitM: z.number().optional(),
});

export const RiskSchema = z.object({
  ground: z.object({
    characterisation: z.string().optional(),
    mitigations: MitigationLevelEnum.optional(),
    ERP: MitigationLevelEnum.optional(),
  }).optional(),
  air: z.object({
    residualARC: z.object({
      operational: ARCEnum.optional(),
      adjacent: ARCEnum.optional(),
    }).optional(),
    strategic: z.boolean().optional(),
    tactical: z.string().optional(), // free text description
  }).optional(),
});

/** Equipment */
export const EquipmentSchema = z.object({
  drone: z.object({
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    type: z.enum(["Multirotor", "Aeroplane", "Helicopter", "Hybrid/VTOL", "LighterThanAir", "Other"]).optional(),
  }).optional(),
  specs: z.object({
    spanM: z.number().optional(),           // max characteristic dimension
    tomKg: z.number().optional(),           // take-off mass
    maxSpeedMs: z.number().optional(),      // maximum speed (m/s)
  }).optional(),
  identifiers: z.object({
    serial: z.string().optional(),
    uaReg: z.string().optional(), // UA registration mark (if applicable)
  }).optional(),
  certificates: z.object({
    tc: z.string().optional(),    // type certificate
    dvr: z.string().optional(),   // design verification report
    cofa: z.string().optional(),  // certificate of airworthiness
    noise: z.string().optional(), // noise certificate
  }).optional(),
});

/** Branding */
export const BrandingSchema = z.object({
  color: HexColor, // empty → default gray in renderer
  logoUrl: UrlStr.optional(),
});

/** Summary / recommendations */
export const SummarySchema = z.object({
  condition: ConditionEnum.optional(),
  urgency: UrgencyEnum.optional(),
  topIssues: z.array(z.string()).optional(),
});

export const RecommendationsSchema = z.object({
  global: z.string().optional(),
});

/** Findings */
export const FindingSchema = z.object({
  area: z.string().min(1),
  defect: z.string().min(1),
  severity: z.enum(["Minor", "Moderate", "Severe"]).optional(),
  recommendation: z.enum(["Monitor", "Repair", "Replace", "Further investigation"]).optional(),
  note: z.string().optional(),
  imageRefs: z.array(z.string()).default([]),
});

/** Media */
export const ImageSchema = z.object({
  id: z.string().optional(),
  url: UrlStr,
  thumb: UrlStr.optional(),
  filename: z.string().optional(),
});

export const VideoSchema = z.object({
  url: UrlStr,
  thumb: UrlStr.optional(),
  filename: z.string().optional(),
});

export const MediaSchema = z.object({
  images: z.array(ImageSchema).min(1).max(200),
  videos: z.array(VideoSchema).max(3).default([]),
});

/** Prepared by / compliance */
export const PreparedBySchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  credentials: z.string().optional(),
}).optional();

export const ComplianceSchema = z.object({
  omRef: z.string().optional(),        // operations manual reference
  evidenceRef: z.string().optional(),  // compliance evidence file reference
  eventsNote: z.string().optional(),   // events to be reported note
  insuranceConfirmed: z.boolean().optional(),
});

/** Scope and areas */
export const ScopeSchema = z.object({
  types: z.array(ScopeTypeEnum).default([]),
});

export const IntakeSchema = z.object({
  mode: ModeEnum.default("easy"),
  tier: TierEnum.default("raw"), // NEW FIELD

  contact: ContactSchema,
  operator: OperatorSchema.optional(),
  authorisation: AuthorisationSchema.optional(),

  site: SiteSchema.optional(),
  inspection: InspectionSchema,
  weather: WeatherSchema.optional(),
  flight: FlightSchema.optional(),
  constraints: ConstraintsSchema.optional(),
  risk: RiskSchema.optional(),

  equipment: EquipmentSchema.optional(),
  branding: BrandingSchema.optional(),

  scope: ScopeSchema.optional(),
  areas: z.array(z.string()).optional(),

  summary: SummarySchema.optional(),
  recommendations: RecommendationsSchema.optional(),

  findings: z.array(FindingSchema).optional(),

  media: MediaSchema,

  preparedBy: PreparedBySchema,
  compliance: ComplianceSchema.optional(),

  notes: z.string().optional(),
})
.superRefine((data, ctx) => {
  // Enforce hex color format only if present (already handled), ensure images exist (handled by min)
  // Mode-based required fields
  if (data.mode === "advanced") {
    const missing: string[] = [];

    // Operator registration
    if (!data.operator?.registration) missing.push("operator.registration");

    // Equipment basic identity
    if (!data.equipment?.drone?.manufacturer) missing.push("equipment.drone.manufacturer");
    if (!data.equipment?.drone?.model) missing.push("equipment.drone.model");

    // Site address
    if (!data.site?.address) missing.push("site.address");

    // Scope + at least one area
    const typesLen = data.scope?.types?.length ?? 0;
    if (typesLen < 1) missing.push("scope.types[≥1]");

    const areasLen = data.areas?.length ?? 0;
    if (areasLen < 1) missing.push("areas[≥1]");

    // Weather, flight basics, constraints.heightLimitM
    if (!data.weather) missing.push("weather");
    if (!data.flight?.type) missing.push("flight.type");
    if (data.constraints?.heightLimitM == null) missing.push("constraints.heightLimitM");
    if (!data.preparedBy?.name) missing.push("preparedBy.name");

    if (missing.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Advanced mode missing required fields: ${missing.join(", ")}`,
        path: ["mode"],
      });
    }
  }
});

export type Intake = z.infer<typeof IntakeSchema>;
