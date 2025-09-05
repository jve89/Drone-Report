// shared/types/finding.ts

export type Severity = 1 | 2 | 3 | 4 | 5;

export type AnnotationKind = "box";

export interface Annotation {
  id: string;
  kind: AnnotationKind; // "box" for v1
  rect: { x: number; y: number; w: number; h: number }; // normalized 0..1
  index: number; // visible label on photo, unique per photo
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category?: string;
  location?: string;
  description?: string;
  tags: string[];
  photoId: string;            // primary photo
  photoIds?: string[];        // optional extra photos (P1)
  annotations: Annotation[];  // per-photo annotations (v1 uses primary photo)
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}
