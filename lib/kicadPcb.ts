/**
 * Lightweight KiCad .kicad_pcb reader. It turns the board file into plain geometry
 * (outline, pads, tracks, component footprints) that the 3D viewer can extrude.
 * It is not a full KiCad implementation — just enough for a faithful board preview.
 */

export type SExpr = string | SExpr[];
export type Pt = { x: number; y: number };
export type Side = "top" | "bottom";

export type PcbPad = { x: number; y: number; w: number; h: number; rot: number; shape: string; sides: Side[]; drill: number };
export type PcbTrack = { x1: number; y1: number; x2: number; y2: number; width: number; side: Side };
export type PcbVia = { x: number; y: number; size: number; drill: number };
export type PcbBody = { cx: number; cy: number; w: number; h: number; rot: number; side: Side; height: number; ref: string };

export type PcbModel = {
  thickness: number;
  outline: Pt[];
  holes: Pt[][];
  pads: PcbPad[];
  tracks: PcbTrack[];
  vias: PcbVia[];
  bodies: PcbBody[];
};

/* ---------------- s-expression parsing ---------------- */

export function parseSExpr(source: string): SExpr {
  const stack: SExpr[][] = [[]];
  let i = 0;
  const n = source.length;
  while (i < n) {
    const char = source[i];
    if (char === "(") {
      const list: SExpr[] = [];
      stack[stack.length - 1].push(list);
      stack.push(list);
      i += 1;
    } else if (char === ")") {
      if (stack.length > 1) stack.pop();
      i += 1;
    } else if (char === '"') {
      let value = "";
      i += 1;
      while (i < n && source[i] !== '"') {
        if (source[i] === "\\" && i + 1 < n) {
          value += source[i + 1];
          i += 2;
        } else {
          value += source[i];
          i += 1;
        }
      }
      stack[stack.length - 1].push(value);
      i += 1;
    } else if (char === " " || char === "\n" || char === "\r" || char === "\t") {
      i += 1;
    } else {
      const start = i;
      while (i < n && !" \n\r\t()\"".includes(source[i])) i += 1;
      stack[stack.length - 1].push(source.slice(start, i));
    }
  }
  const root = stack[0];
  return root.length === 1 ? root[0] : root;
}

const isList = (node: SExpr | undefined): node is SExpr[] => Array.isArray(node);
const head = (node: SExpr) => (isList(node) && typeof node[0] === "string" ? node[0] : "");
const child = (node: SExpr[], name: string) => node.find((item) => isList(item) && item[0] === name) as SExpr[] | undefined;
const children = (node: SExpr[], name: string) => node.filter((item) => isList(item) && item[0] === name) as SExpr[][];
const num = (value: SExpr | undefined, fallback = 0) => {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};
const xy = (node: SExpr[] | undefined): Pt | null => (node ? { x: num(node[1]), y: num(node[2]) } : null);
const layerOf = (node: SExpr[]) => {
  const layer = child(node, "layer");
  return layer && typeof layer[1] === "string" ? layer[1] : "";
};

/* ---------------- geometry helpers ---------------- */

/** Rotates a local footprint point into board space (KiCad angles are CCW on a Y-down canvas). */
export function rotatePoint(p: Pt, degrees: number): Pt {
  if (!degrees) return p;
  const r = (degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: p.x * cos + p.y * sin, y: -p.x * sin + p.y * cos };
}

function circleThrough(a: Pt, b: Pt, c: Pt): { cx: number; cy: number; r: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const cx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const cy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { cx, cy, r: Math.hypot(a.x - cx, a.y - cy) };
}

/** Points along an arc from start through mid to end. */
function arcPoints(start: Pt, mid: Pt, end: Pt): Pt[] {
  const circle = circleThrough(start, mid, end);
  if (!circle) return [start, end];
  const angle = (p: Pt) => Math.atan2(p.y - circle.cy, p.x - circle.cx);
  const a0 = angle(start);
  let a1 = angle(mid);
  let a2 = angle(end);
  // pick the sweep direction that passes through the midpoint
  const norm = (v: number) => ((v % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const ccwMid = norm(a1 - a0);
  const ccwEnd = norm(a2 - a0);
  const sweep = ccwMid <= ccwEnd ? ccwEnd : ccwEnd - 2 * Math.PI;
  a1 = a0;
  a2 = a0 + sweep;
  const steps = Math.max(6, Math.ceil(Math.abs(sweep) / (Math.PI / 24)));
  const out: Pt[] = [];
  for (let s = 0; s <= steps; s += 1) {
    const t = a1 + ((a2 - a1) * s) / steps;
    out.push({ x: circle.cx + circle.r * Math.cos(t), y: circle.cy + circle.r * Math.sin(t) });
  }
  out[0] = start;
  out[out.length - 1] = end;
  return out;
}

function circlePoints(c: Pt, r: number, steps = 48): Pt[] {
  return Array.from({ length: steps }, (_, s) => {
    const t = (s / steps) * Math.PI * 2;
    return { x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) };
  });
}

export function polygonArea(points: Pt[]) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

const close = (a: Pt, b: Pt, tolerance: number) => Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;

/** Joins loose edge segments into closed loops by matching endpoints. */
export function chainSegments(segments: Pt[][], tolerance = 0.01): Pt[][] {
  const pool = segments.filter((segment) => segment.length >= 2).map((segment) => [...segment]);
  const loops: Pt[][] = [];
  while (pool.length) {
    const loop = pool.shift() as Pt[];
    let grew = true;
    while (grew && !close(loop[0], loop[loop.length - 1], tolerance)) {
      grew = false;
      const tail = loop[loop.length - 1];
      for (let i = 0; i < pool.length; i += 1) {
        const segment = pool[i];
        if (close(segment[0], tail, tolerance)) loop.push(...segment.slice(1));
        else if (close(segment[segment.length - 1], tail, tolerance)) loop.push(...segment.slice(0, -1).reverse());
        else continue;
        pool.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (close(loop[0], loop[loop.length - 1], tolerance)) loop.pop();
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/* ---------------- graphics → edge segments ---------------- */

function shapeSegments(node: SExpr[], transform: (p: Pt) => Pt): Pt[][] {
  const kind = head(node).replace(/^(gr|fp)_/, "");
  const start = xy(child(node, "start"));
  const end = xy(child(node, "end"));
  const map = (points: Pt[]) => points.map(transform);

  if (kind === "line" && start && end) return [map([start, end])];
  if (kind === "rect" && start && end) {
    return [map([start, { x: end.x, y: start.y }, end, { x: start.x, y: end.y }, start])];
  }
  if (kind === "circle") {
    const center = xy(child(node, "center")) || start;
    if (!center || !end) return [];
    const ring = circlePoints(center, Math.hypot(end.x - center.x, end.y - center.y));
    return [map([...ring, ring[0]])];
  }
  if (kind === "arc" && start && end) {
    const mid = xy(child(node, "mid"));
    if (mid) return [map(arcPoints(start, mid, end))];
    // KiCad 5 style: start = centre, end = arc start, angle = sweep (degrees)
    const angle = num(child(node, "angle")?.[1]);
    const r = Math.hypot(end.x - start.x, end.y - start.y);
    const a0 = Math.atan2(end.y - start.y, end.x - start.x);
    const sweep = (angle * Math.PI) / 180;
    const steps = Math.max(6, Math.ceil(Math.abs(sweep) / (Math.PI / 24)));
    return [map(Array.from({ length: steps + 1 }, (_, s) => {
      const t = a0 + (sweep * s) / steps;
      return { x: start.x + r * Math.cos(t), y: start.y + r * Math.sin(t) };
    }))];
  }
  if (kind === "poly") {
    const pts = child(node, "pts");
    if (!pts) return [];
    const points = children(pts, "xy").map((p) => ({ x: num(p[1]), y: num(p[2]) }));
    return points.length >= 3 ? [map([...points, points[0]])] : [];
  }
  return [];
}

/* ---------------- main entry ---------------- */

export function parseKicadPcb(source: string): PcbModel {
  const root = parseSExpr(source);
  if (!isList(root) || head(root) !== "kicad_pcb") throw new Error("This does not look like a KiCad PCB file.");

  const general = child(root, "general");
  const setup = child(root, "setup");
  const stackup = setup ? child(setup, "stackup") : undefined;
  let thickness = num(general && child(general, "thickness")?.[1], 0);
  if (!thickness && stackup) {
    thickness = children(stackup, "layer").reduce((sum, layer) => sum + num(child(layer, "thickness")?.[1]), 0);
  }
  if (!thickness) thickness = 1.6;

  const edges: Pt[][] = [];
  const pads: PcbPad[] = [];
  const tracks: PcbTrack[] = [];
  const vias: PcbVia[] = [];
  const bodies: PcbBody[] = [];
  const identity = (p: Pt) => p;

  root.forEach((node) => {
    if (!isList(node)) return;
    const tag = head(node);

    if (tag.startsWith("gr_") && layerOf(node) === "Edge.Cuts") edges.push(...shapeSegments(node, identity));

    if (tag === "segment") {
      const s = xy(child(node, "start"));
      const e = xy(child(node, "end"));
      const layer = layerOf(node);
      if (s && e && (layer === "F.Cu" || layer === "B.Cu")) {
        tracks.push({ x1: s.x, y1: s.y, x2: e.x, y2: e.y, width: num(child(node, "width")?.[1], 0.25), side: layer === "F.Cu" ? "top" : "bottom" });
      }
    }

    if (tag === "via") {
      const at = xy(child(node, "at"));
      if (at) vias.push({ ...at, size: num(child(node, "size")?.[1], 0.8), drill: num(child(node, "drill")?.[1], 0.4) });
    }

    if (tag === "footprint" || tag === "module") {
      const at = child(node, "at");
      const origin = { x: num(at?.[1]), y: num(at?.[2]) };
      const fpRot = num(at?.[3]);
      const side: Side = layerOf(node).startsWith("B.") ? "bottom" : "top";
      const toBoard = (p: Pt) => {
        const r = rotatePoint(p, fpRot);
        return { x: origin.x + r.x, y: origin.y + r.y };
      };

      const name = typeof node[1] === "string" ? node[1] : "";
      const refProp = node.find((item) => isList(item) && ((item[0] === "property" && item[1] === "Reference") || (item[0] === "fp_text" && item[1] === "reference"))) as SExpr[] | undefined;
      const ref = refProp && typeof refProp[2] === "string" ? refProp[2] : "";

      // footprint graphics on Edge.Cuts also shape the board (e.g. cut-outs)
      const graphics = node.filter((item) => isList(item) && head(item).startsWith("fp_")) as SExpr[][];
      graphics.filter((g) => layerOf(g) === "Edge.Cuts").forEach((g) => edges.push(...shapeSegments(g, toBoard)));

      const localPads: { x: number; y: number; w: number; h: number }[] = [];
      children(node, "pad").forEach((pad) => {
        const padAt = child(pad, "at");
        const local = { x: num(padAt?.[1]), y: num(padAt?.[2]) };
        const size = child(pad, "size");
        const w = num(size?.[1], 1);
        const h = num(size?.[2], w);
        const drillNode = child(pad, "drill");
        const drill = drillNode ? num(drillNode.find((v, i) => i > 0 && typeof v === "string" && v !== "oval")) : 0;
        const layersNode = child(pad, "layers");
        const layers = (layersNode ? layersNode.slice(1) : []).filter((v): v is string => typeof v === "string");
        const sides: Side[] = [];
        if (layers.some((l) => l === "F.Cu" || l === "*.Cu")) sides.push("top");
        if (layers.some((l) => l === "B.Cu" || l === "*.Cu")) sides.push("bottom");
        if (!sides.length && drill) sides.push("top", "bottom");
        localPads.push({ ...local, w, h });
        if (!sides.length && !drill) return;
        const board = toBoard(local);
        // KiCad 6+ stores pad angles as absolute values
        const padRot = padAt?.[3] !== undefined ? num(padAt[3]) : fpRot;
        pads.push({ x: board.x, y: board.y, w, h, rot: padRot, shape: typeof pad[3] === "string" ? pad[3] : "rect", sides, drill });
      });

      const skip = /mounting|testpoint|fiducial|logo|hole|jumper|solderjumper|netTie/i.test(name);
      if (skip) return;

      // component body = courtyard bounds (fallbacks: fab layer, then pads)
      const boxPoints = (layerSuffix: string) => graphics
        .filter((g) => layerOf(g).endsWith(layerSuffix))
        .flatMap((g) => shapeSegments(g, identity).flat());
      let points = boxPoints(".CrtYd");
      if (points.length < 2) points = boxPoints(".Fab");
      if (points.length < 2) points = localPads.flatMap((p) => [{ x: p.x - p.w / 2, y: p.y - p.h / 2 }, { x: p.x + p.w / 2, y: p.y + p.h / 2 }]);
      if (points.length < 2) return;
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const w = (maxX - minX) * 0.86;
      const h = (maxY - minY) * 0.86;
      if (w < 0.2 || h < 0.2) return;
      const center = toBoard({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
      const throughHole = localPads.length > 0 && children(node, "pad").some((p) => p[2] === "thru_hole");
      const height = throughHole ? Math.min(Math.max(Math.min(w, h) * 0.8, 2), 12) : Math.min(Math.max(Math.min(w, h) * 0.45, 0.5), 3);
      bodies.push({ cx: center.x, cy: center.y, w, h, rot: fpRot, side, height, ref });
    }
  });

  const loops = chainSegments(edges).sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)));
  let outline = loops[0] || [];
  const holes = loops.slice(1);

  if (outline.length < 3) {
    // No Edge.Cuts outline — fall back to a rectangle around everything on the board.
    const pts: Pt[] = [
      ...pads.map((p) => ({ x: p.x, y: p.y })),
      ...tracks.flatMap((t) => [{ x: t.x1, y: t.y1 }, { x: t.x2, y: t.y2 }]),
      ...bodies.map((b) => ({ x: b.cx, y: b.cy })),
    ];
    if (!pts.length) throw new Error("The PCB file has no board outline or parts to show.");
    const minX = Math.min(...pts.map((p) => p.x)) - 3;
    const maxX = Math.max(...pts.map((p) => p.x)) + 3;
    const minY = Math.min(...pts.map((p) => p.y)) - 3;
    const maxY = Math.max(...pts.map((p) => p.y)) + 3;
    outline = [{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }];
  }

  return { thickness, outline, holes, pads, tracks, vias, bodies };
}
