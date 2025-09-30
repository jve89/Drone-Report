// client/src/export/images/annotate.ts
export type Box = { x: number; y: number; w: number; h: number; index: number };
type Opts = { stroke?: string; lineWidth?: number; font?: string; badgeFill?: string; badgeText?: string };

/**
 * Draws indexed boxes on top of an image and returns a PNG data URL.
 * Coordinates are normalized (0..1) relative to image width/height.
 */
export async function annotateImage(url: string, boxes: Box[], opts: Opts = {}): Promise<string> {
  const stroke = opts.stroke ?? "rgba(249,115,22,1)";
  const lineWidth = opts.lineWidth ?? 4;
  const font = opts.font ?? "bold 14px sans-serif";
  const badgeFill = opts.badgeFill ?? "rgba(249,115,22,1)";
  const badgeText = opts.badgeText ?? "#fff";

  const img = await load(url);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context not available");

  ctx.drawImage(img, 0, 0);

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.font = font;
  ctx.textBaseline = "top";

  for (const b of boxes) {
    // Convert normalized coords to pixels and clamp to canvas
    let x = Math.round(b.x * canvas.width);
    let y = Math.round(b.y * canvas.height);
    let w = Math.round(b.w * canvas.width);
    let h = Math.round(b.h * canvas.height);

    // Clamp and ensure at least 1px size
    x = Math.max(0, Math.min(x, canvas.width - 1));
    y = Math.max(0, Math.min(y, canvas.height - 1));
    w = Math.max(1, Math.min(w, canvas.width - x));
    h = Math.max(1, Math.min(h, canvas.height - y));

    // box
    ctx.strokeRect(x, y, w, h);

    // badge
    const label = String(b.index);
    const paddingX = 4;
    const paddingY = 2;

    const metrics = ctx.measureText(label);
    const textH =
      (metrics.actualBoundingBoxAscent ?? 0) +
        (metrics.actualBoundingBoxDescent ?? 0) ||
      parseInt(font, 10) ||
      12;

    const bw = Math.ceil(metrics.width) + paddingX * 2;
    const bh = Math.ceil(textH) + paddingY * 2;

    ctx.fillStyle = badgeFill;
    roundRect(ctx, x - 6, y - 6, bw, bh, 4);
    ctx.fill();

    ctx.fillStyle = badgeText;
    ctx.fillText(label, x - 6 + paddingX, y - 6 + paddingY);
  }

  ctx.restore();

  return canvas.toDataURL("image/png");
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // requires CORS headers from source
    img.onload = () => {
      // Prefer decode() when available to ensure pixels are ready
      if ("decode" in img && typeof (img as any).decode === "function") {
        (img as any)
          .decode()
          .then(() => res(img))
          .catch(() => res(img)); // fallback to onload-complete
      } else {
        res(img);
      }
    };
    img.onerror = (e) => rej(e);
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
