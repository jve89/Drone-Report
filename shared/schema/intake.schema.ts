import { z } from "zod";

/** Basic enums */
export const ConditionEnum = z.enum(["Excellent", "Good", "Fair", "Poor"]);
export const UrgencyEnum = z.enum(["None", "Low", "Medium", "High", "Critical"]);
export const ScopeTypeEnum = z.enum(["General", "Roof", "Facade", "Solar", "Insurance", "Progress", "Other"]);
export const FlightTypeEnum = z.enum(["Manual", "Automated"]);
export const ARCEnum = z.enum(["ARC-a", "ARC-b", "ARC-c", "ARC-d"]);
export const MitigationLevelEnum = z.enum(["none", "low", "medium", "high"]);

/** Reusable primitives */
const UrlStr = z.string().url();
const EmailStr = z.string().email();
const PhoneStr = z.string().min(3).max(50).optional();
const HexColor = z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional();

/** Contact / operator */
export const ContactSchema = z.object({
  email: EmailStr.optional(),
  project: z.string().optional(),
  company: z.string().optional(),
  name: z.string().optional(),
  phone: PhoneStr,
});

export const OperatorSchema = z.object({
  registration: z.string().optional(),
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
  mapImageUrl: UrlStr.optional(),
});

export const InspectionSchema = z.object({
  date: z.string().optional(), // renderer shows "—" if missing
  time: z.string().optional(),
});

export const WeatherSchema = z.object({
  tempC: z.number().optional(),
  windMs: z.number().optional(),
  precip: z.string().optional(),
  cloud: z.string().optional(),
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
    tactical: z.string().optional(),
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
    spanM: z.number().optional(),
    tomKg: z.number().optional(),
    maxSpeedMs: z.number().optional(),
  }).optional(),
  identifiers: z.object({
    serial: z.string().optional(),
    uaReg: z.string().optional(),
  }).optional(),
  certificates: z.object({
    tc: z.string().optional(),
    dvr: z.string().optional(),
    cofa: z.string().optional(),
    noise: z.string().optional(),
  }).optional(),
});

/** Branding */
export const BrandingSchema = z.object({
  color: HexColor,
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
  area: z.string().optional(),
  defect: z.string().optional(),
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
  note: z.string().optional(),
});

export const VideoSchema = z.object({
  url: UrlStr,
  thumb: UrlStr.optional(),
  filename: z.string().optional(),
});

export const MediaSchema = z.object({
  images: z.array(ImageSchema).max(200).default([]), // allow zero
  videos: z.array(VideoSchema).max(3).default([]),
}).default({ images: [], videos: [] });

/** Prepared by / compliance */
export const PreparedBySchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  credentials: z.string().optional(),
}).optional();

export const ComplianceSchema = z.object({
  omRef: z.string().optional(),
  evidenceRef: z.string().optional(),
  eventsNote: z.string().optional(),
  insuranceConfirmed: z.boolean().optional(),
});

/** Scope and areas */
export const ScopeSchema = z.object({
  types: z.array(ScopeTypeEnum).default(["General"]),
});

/** Intake */
export const IntakeSchema = z.object({
  contact: ContactSchema.optional(),
  operator: OperatorSchema.optional(),
  authorisation: AuthorisationSchema.optional(),

  site: SiteSchema.optional(),
  inspection: InspectionSchema.optional(),
  weather: WeatherSchema.optional(),
  flight: FlightSchema.optional(),
  constraints: ConstraintsSchema.optional(),
  risk: RiskSchema.optional(),

  equipment: EquipmentSchema.optional(),
  branding: BrandingSchema.optional(),

  scope: ScopeSchema.default({ types: ["General"] }).optional(),
  areas: z.array(z.string()).optional(),

  summary: SummarySchema.optional(),
  recommendations: RecommendationsSchema.optional(),

  findings: z.array(FindingSchema).optional(),

  media: MediaSchema, // defaults to {images:[], videos:[]}

  preparedBy: PreparedBySchema,
  compliance: ComplianceSchema.optional(),

  notes: z.string().optional(),
});

export type Intake = z.infer<typeof IntakeSchema>;
