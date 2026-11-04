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

/** Identity used to spot the same document stored more than once. */
export function attachmentKey(item: Pick<Attachment, "name" | "url" | "family" | "size">) {
  // Re-uploads get a fresh storage path, so uploaded files match on name + size instead of URL.
  if (item.family !== "link" && item.size) return `file:${item.name.trim().toLowerCase()}:${item.size}`;
  return `url:${item.url.trim().replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase()}`;
}

/** Removes repeated attachments (the same link, or the same file uploaded twice). */
export function uniqueAttachments(items: Attachment[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.url) return false;
    const key = attachmentKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
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

/* ---------------- in-app preview ---------------- */

export type PreviewKind = "image" | "pdf" | "office" | "markdown" | "table" | "text" | "embed" | "model" | "none";

const BROWSER_IMAGES = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
const OFFICE_DOCS = ["doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx", "odt", "ods", "odp", "rtf"];
const PLAIN_TEXT = ["txt", "json", "yaml", "yml", "xml", "log", "tex", "scad", "gcode", "net"];

/** Builds an embeddable URL for well-known link hosts (Google Docs/Drive, YouTube), or null. */
export function embedUrlFor(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "docs.google.com") {
    const match = /^\/(document|spreadsheets|presentation|drawings)\/d\/([^/]+)/.exec(parsed.pathname);
    if (match) return `https://docs.google.com/${match[1]}/d/${match[2]}/preview`;
  }
  if (host === "drive.google.com") {
    const byPath = /\/file\/d\/([^/]+)/.exec(parsed.pathname);
    const id = byPath ? byPath[1] : parsed.searchParams.get("id");
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = parsed.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  return null;
}

/** Decides how the viewer should render an attachment. */
export function previewKindOf(item: Pick<Attachment, "name" | "url" | "family">): PreviewKind {
  if (item.family === "link") {
    if (embedUrlFor(item.url)) return "embed";
    const ext = extensionOf(new URL(item.url, "https://x").pathname);
    if (ext === "pdf") return "pdf";
    if (BROWSER_IMAGES.includes(ext)) return "image";
    return "none";
  }
  const ext = extensionOf(item.name) || extensionOf(item.url);
  if (BROWSER_IMAGES.includes(ext)) return "image";
  if (["stl", "step", "stp", "kicad_pcb"].includes(ext)) return "model";
  if (ext === "pdf") return "pdf";
  if (OFFICE_DOCS.includes(ext)) return "office";
  if (ext === "md") return "markdown";
  if (ext === "csv" || ext === "tsv") return "table";
  if (PLAIN_TEXT.includes(ext)) return "text";
  return "none";
}

/** Microsoft's free viewer renders Word/Excel/PowerPoint from any public URL. */
export function officeViewerUrl(url: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

/** Minimal CSV/TSV parser that understands quoted cells. */
export function parseDelimited(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
