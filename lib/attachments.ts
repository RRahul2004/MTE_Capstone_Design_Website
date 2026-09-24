export type AttachmentFamily = "doc" | "sheet" | "slides" | "cad" | "pcb" | "image" | "data" | "link" | "other";

export type Attachment = {
  name: string;
  url: string;
  family: AttachmentFamily;
  ext?: string;
  size?: number;
};

const FAMILY_EXTENSIONS: Record<Exclude<AttachmentFamily, "link">, string[]> = {
  doc: ["pdf", "txt", "md", "rtf", "doc", "docx", "odt", "tex"],
  sheet: ["xls", "xlsx", "xlsm", "csv", "tsv", "ods", "numbers"],
  slides: ["ppt", "pptx", "key", "odp"],
  cad: [
    "stl", "step", "stp", "iges", "igs", "3mf", "obj", "dxf", "dwg", "sldprt", "sldasm", "slddrw",
    "ipt", "iam", "f3d", "f3z", "catpart", "prt", "x_t", "x_b", "scad", "gcode",
  ],
  pcb: ["kicad_pcb", "kicad_sch", "kicad_pro", "sch", "brd", "pcb", "pcbdoc", "schdoc", "gbr", "gerber", "drl", "net", "lib"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic", "bmp", "tif", "tiff"],
  data: ["json", "yaml", "yml", "xml", "log", "mat", "npy", "bag", "db", "zip", "7z", "tar", "gz"],
  other: [],
};

export const FAMILY_LABELS: Record<AttachmentFamily, string> = {
  doc: "Documents",
  sheet: "Spreadsheets",
  slides: "Slide decks",
  cad: "CAD & 3D",
  pcb: "PCB & electrical",
  image: "Images",
  data: "Data & archives",
  link: "Links",
  other: "Other files",
};

export const FAMILY_ICONS: Record<AttachmentFamily, string> = {
  doc: "DOC",
  sheet: "XLS",
  slides: "PPT",
  cad: "CAD",
  pcb: "PCB",
  image: "IMG",
  data: "DAT",
  link: "URL",
  other: "FILE",
};

export const FAMILY_ORDER: AttachmentFamily[] = ["doc", "slides", "sheet", "cad", "pcb", "image", "data", "link", "other"];

export const UPLOAD_ACCEPT = Object.values(FAMILY_EXTENSIONS)
  .flat()
  .map((ext) => `.${ext}`)
  .join(",");

export function extensionOf(name: string) {
  const clean = name.split("?")[0].split("#")[0];
  const lower = clean.toLowerCase();
  const kicad = ["kicad_pcb", "kicad_sch", "kicad_pro"].find((ext) => lower.endsWith(`.${ext}`));
  if (kicad) return kicad;
  const parts = lower.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function familyOf(name: string): AttachmentFamily {
  const ext = extensionOf(name);
  if (!ext) return "other";
  const hit = (Object.keys(FAMILY_EXTENSIONS) as Exclude<AttachmentFamily, "link">[]).find((family) =>
    FAMILY_EXTENSIONS[family].includes(ext),
  );
  return hit ?? "other";
}

export function formatSize(bytes?: number) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function groupAttachments(items: Attachment[]) {
  const groups = new Map<AttachmentFamily, Attachment[]>();
  items.forEach((item) => {
    const list = groups.get(item.family) || [];
    list.push(item);
    groups.set(item.family, list);
  });
  return FAMILY_ORDER.filter((family) => groups.has(family)).map((family) => ({
    family,
    label: FAMILY_LABELS[family],
    items: groups.get(family) as Attachment[],
  }));
}

export function parseLinks(raw: string): Attachment[] {
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((url) => {
      const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      let label = normalized;
      try {
        const parsed = new URL(normalized);
        label = parsed.hostname.replace(/^www\./, "") + (parsed.pathname === "/" ? "" : parsed.pathname);
      } catch {
        /* keep raw */
      }
      return { name: label.length > 60 ? `${label.slice(0, 57)}...` : label, url: normalized, family: "link" as const };
    });
}

export const STORAGE_BUCKET = "design-files";

/** Turns a public storage URL back into the object path inside the bucket. */
export function storagePath(url: string) {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/** Collects every uploaded-file path from a set of attachments (links are skipped). */
export function storagePathsOf(items: (Attachment | null | undefined)[]) {
  return items
    .filter((item): item is Attachment => Boolean(item) && item!.family !== "link")
    .map((item) => storagePath(item.url))
    .filter((path): path is string => Boolean(path));
}
