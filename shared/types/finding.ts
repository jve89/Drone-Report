// shared/types/finding.ts

export type Severity = 1 | 2 | 3 | 4 | 5;

export type AnnotationKind = "box";

export interface Annotation {
  id: string;
  kind: AnnotationKind; // "box" for v1
  /**
   * Normalized rectangle coordinates in percent units.
   * Invariant: 0 <= x,y,w,h <= 1 and x+w,y+h <= 1 after clamping.
   */
  rect: { x: number; y: number; w: number; h: number };
  /**
   * 1-based visible label on photo.
   * Invariant: unique per photo (reindexed sequentially as 1..N).
   */
  index: number;
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
