import { prettyName, teamRoster } from "./team";

export type ParsedActionItem = { text: string; owner: string; due: string | null; done: boolean };

export type ParsedMeeting = {
  title: string;
  meetingDate: string;
  attendees: string[];
  text: string;
  actionItems: ParsedActionItem[];
};

const ISO_DATE = /\b(\d{4}-\d{2}-\d{2})\b/;
const META_LINE = /^\s*(title|date|meeting date|attendees|present)\s*:\s*(.*)$/i;
const ACTION_HEADING = /^\s*#{1,6}\s*(action items?|actions|todos?|to-?dos?|next steps)\s*:?\s*$/i;

function validDate(value: string) {
  const time = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function formatTitleDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

/** Maps "Rahul", "@neel", "ng2li" or a full name to a roster name when possible. */
export function resolveMember(raw: string) {
  const value = raw.trim().replace(/^@/, "").replace(/[.,;]+$/, "");
  if (!value) return "";
  const lower = value.toLowerCase();
  const byFirstOrFull = teamRoster.find((member) => {
    const name = member.name.toLowerCase();
    return name === lower || name.split(/\s+/)[0] === lower;
  });
  return byFirstOrFull ? byFirstOrFull.name : prettyName(value);
}

function parseActionItem(line: string, fallbackOwner: string): ParsedActionItem | null {
  const match = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[( |x|X)\]\s*)?(.*)$/);
  if (!match) return null;
  let rest = match[2].trim();
  if (!rest) return null;
  const done = (match[1] || "").toLowerCase() === "x";

  let due: string | null = null;
  const dueMatch = rest.match(/\(?\s*(?:due|by)\s*:?\s*(\d{4}-\d{2}-\d{2})\s*\)?/i);
  if (dueMatch && validDate(dueMatch[1])) {
    due = dueMatch[1];
    rest = rest.replace(dueMatch[0], " ");
  }

  let owner = "";
  const mention = rest.match(/(?:^|\s)@([A-Za-z][A-Za-z0-9._-]*)/);
  if (mention) {
    owner = resolveMember(mention[1]);
    rest = rest.replace(mention[0], " ");
  } else {
    // "Task — Owner" or "Task | Owner | 2026-10-25"
    const parts = rest.split(/\s+[—–|]\s+|\s+-\s+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      if (!due && ISO_DATE.test(last) && validDate(last.match(ISO_DATE)![1]) && parts.length >= 3) {
        due = last.match(ISO_DATE)![1];
        parts.pop();
      }
      if (parts.length >= 2 && parts[parts.length - 1].split(/\s+/).length <= 3) {
        owner = resolveMember(parts.pop()!);
      }
      rest = parts.join(" — ");
    }
  }

  const text = rest.replace(/\s{2,}/g, " ").trim();
  return text ? { text, owner: owner || fallbackOwner, due, done } : null;
}

/**
 * Turns a plain-text/markdown meeting note into a design-log meeting entry.
 *
 * Optional header lines: `Title:`, `Date:`, `Attendees:`. A `# Heading` on the
 * first line also works as the title. Items under an `## Action items` heading
 * become trackable action items (`- [ ] Task @Owner due 2026-10-25`).
 */
export function parseMeetingNotes(
  raw: string,
  options: { fileName?: string; fallbackDate?: string; fallbackOwner?: string } = {},
): ParsedMeeting {
  const lines = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const fallbackOwner = options.fallbackOwner || "";
  let title = "";
  let meetingDate = "";
  let attendees: string[] = [];
  const body: string[] = [];
  const actionItems: ParsedActionItem[] = [];
  let inActions = false;
  let inHeader = true;

  for (const line of lines) {
    const meta = inHeader ? line.match(META_LINE) : null;
    if (meta) {
      const key = meta[1].toLowerCase();
      const value = meta[2].trim();
      if (key === "title") title = value;
      else if (key === "date" || key === "meeting date") {
        const iso = value.match(ISO_DATE)?.[1];
        const parsed = iso || (Number.isFinite(Date.parse(value)) ? new Date(Date.parse(value)).toISOString().slice(0, 10) : "");
        if (parsed && validDate(parsed)) meetingDate = parsed;
      } else attendees = value.split(/[,;]/).map(resolveMember).filter(Boolean);
      continue;
    }
    if (inHeader && !title && !body.some((item) => item.trim()) && /^#\s+\S/.test(line)) {
      title = line.replace(/^#\s+/, "").trim();
      continue;
    }
    if (line.trim()) inHeader = false;

    if (/^\s*#{1,6}\s/.test(line)) {
      inActions = ACTION_HEADING.test(line);
      if (inActions) continue;
    }
    if (inActions) {
      const item = parseActionItem(line, fallbackOwner);
      if (item) {
        actionItems.push(item);
        continue;
      }
      if (!line.trim()) continue;
    }
    body.push(line);
  }

  if (!meetingDate && options.fileName) {
    const fromName = options.fileName.match(ISO_DATE)?.[1];
    if (fromName && validDate(fromName)) meetingDate = fromName;
  }
  if (!meetingDate) meetingDate = options.fallbackDate || new Date().toISOString().slice(0, 10);
  if (!title) title = `Weekly sync — ${formatTitleDate(meetingDate)}`;

  return {
    title,
    meetingDate,
    attendees: Array.from(new Set(attendees)),
    text: body.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    actionItems,
  };
}
