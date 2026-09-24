"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createSupabaseClient } from "../../lib/supabase";
import { Markdown } from "../../lib/markdown";
import { prettyName, resolveDisplayName, teamNames } from "../../lib/team";
import {
  Attachment,
  FAMILY_ICONS,
  UPLOAD_ACCEPT,
  familyOf,
  formatSize,
  groupAttachments,
  parseLinks,
  STORAGE_BUCKET,
  storagePathsOf,
} from "../../lib/attachments";
import { ThemeToggle, useTheme } from "../../lib/theme";
import "./design-log.css";

type Kind = "ideation" | "research" | "progress" | "meeting" | "deliverable";
type Category =
  | "Mech"
  | "EE"
  | "Embedded/Firmware/Controls"
  | "Autonomy / perception"
  | "Systems"
  | "Application SW";
type ResourceType = "Patent" | "Paper" | "Publication" | "Standard" | "Datasheet" | "Article" | "Teardown";
type Stage = "Backlog" | "In progress" | "Testing" | "Completed";
type DeliverableType =
  | "Proposal"
  | "Progress report"
  | "Design review"
  | "Presentation"
  | "Poster"
  | "Demo"
  | "Final report"
  | "Other";
type Comment = {
  id: string | number;
  entry_id: string | number;
  user_id?: string | null;
  author_name: string;
  author_email?: string | null;
  text: string;
  attachments?: Attachment[] | null;
  created_at: string;
};
type ActionItem = { text: string; owner: string; due?: string | null; done?: boolean };

type Entry = {
  id: number | string;
  kind: Kind;
  title?: string | null;
  author_name: string;
  author_email: string;
  text: string;
  created_at: string;
  category: Category;
  photo_url?: string | null;
  link_url?: string | null;
  worked_with?: string[] | null;
  attachments?: Attachment[] | null;
  resource_type?: ResourceType | null;
  resource_authors?: string | null;
  resource_source?: string | null;
  resource_year?: number | string | null;
  meeting_date?: string | null;
  stage?: Stage | null;
  deliverable_type?: DeliverableType | null;
  due_date?: string | null;
  submitted_at?: string | null;
  linked_to?: string | number | null;
  user_id?: string | null;
  action_items?: ActionItem[] | null;
};

const categories: Category[] = [
  "Mech",
  "EE",
  "Embedded/Firmware/Controls",
  "Autonomy / perception",
  "Systems",
  "Application SW",
];
const PAGE_SIZE = 25;
const stages: Stage[] = ["Backlog", "In progress", "Testing", "Completed"];
const stageClass = (stage: Stage) => stage.toLowerCase().replace(/\s+/g, "-");
const deliverableTypes: DeliverableType[] = [
  "Proposal",
  "Progress report",
  "Design review",
  "Presentation",
  "Poster",
  "Demo",
  "Final report",
  "Other",
];
const resourceTypes: ResourceType[] = ["Patent", "Paper", "Publication", "Standard", "Datasheet", "Article", "Teardown"];

const tabs: { key: Kind; label: string; blurb: string }[] = [
  { key: "ideation", label: "Ideation", blurb: "Concepts, directions, and arguments — written long-form." },
  { key: "research", label: "Research", blurb: "Patents, papers, publications, and reference files." },
  { key: "progress", label: "Progress", blurb: "Dated build log of what actually happened." },
  { key: "meeting", label: "Meetings", blurb: "Weekly sync notes, decisions, and action items." },
  { key: "deliverable", label: "Deliverables", blurb: "Proposal, reports, reviews, and presentations — with due dates." },
];

const MEETING_TEMPLATE = [
  "## Agenda",
  "- ",
  "",
  "## Mech",
  "- ",
  "",
  "## EE",
  "- ",
  "",
  "## Embedded / Firmware / Controls",
  "- ",
  "",
  "## Autonomy / Perception",
  "- ",
  "",
  "## Systems",
  "- ",
  "",
  "## Application SW",
  "- ",
  "",
  "## Decisions",
  "- ",
  "",
  "## Blockers",
  "- ",
].join("\n");

const NO_DISCIPLINE = "General";
const disciplineless: Kind[] = ["ideation", "meeting", "deliverable"];
const usesDiscipline = (kind: Kind) => !disciplineless.includes(kind);

const fallbackEntries: Entry[] = [
  {
    id: "i1",
    kind: "ideation",
    linked_to: "m1",
    title: "What if the printer decides where to print next?",
    author_name: "Nathaniel Li",
    author_email: "",
    created_at: "2026-09-22T14:10:00Z",
    category: "Autonomy / perception",
    worked_with: ["Yang Lu"],
    text:
      "Most fabrication machines assume a perfect world: a flat bed, a known material, an uninterrupted job.\n\n## The premise\nWhat if the machine treated the build volume as an **environment to be observed** rather than a coordinate system to be obeyed?\n\n- Scan first, plan second\n- Treat every layer as new evidence\n- Let the toolpath be a *belief*, not a script\n\nThe risk is obvious — an adaptive machine is harder to certify. But the upside is a printer that survives the real world instead of a lab bench.",
  },
  {
    id: "i2",
    kind: "ideation",
    title: "Recovery is a feature, not an error handler",
    author_name: "Rahul Ramkumar",
    author_email: "",
    created_at: "2026-09-20T18:40:00Z",
    category: "Systems",
    text:
      "We keep designing the happy path and bolting failure handling on afterwards.\n\n> If recovery is designed last, it behaves last.\n\nProposal: make *resume from arbitrary state* the first requirement of the control stack, and design the happy path as the trivial case of it.",
  },
  {
    id: "r1",
    kind: "research",
    title: "Closed-loop extrusion control using in-situ thermal imaging",
    author_name: "Yang Lu",
    author_email: "",
    created_at: "2026-09-19T11:00:00Z",
    category: "Autonomy / perception",
    resource_type: "Paper",
    resource_authors: "Okafor, Zhang, Beaulieu",
    resource_source: "Additive Manufacturing Letters",
    resource_year: 2023,
    link_url: "https://example.org/thermal-closed-loop",
    text: "Layer-height error stays under 0.25 mm using only a low-cost thermal array. Their calibration routine is close to what we sketched — worth replicating before we buy a better camera.",
  },
  {
    id: "r2",
    kind: "research",
    title: "US 11,203,155 B2 — Adaptive toolpath generation for additive systems",
    author_name: "Neel Patel",
    author_email: "",
    created_at: "2026-09-17T09:15:00Z",
    category: "Systems",
    resource_type: "Patent",
    resource_authors: "Assignee: Formline Robotics",
    resource_source: "USPTO",
    resource_year: 2021,
    link_url: "https://patents.google.com/",
    text: "Claims cover re-slicing mid-build from sensor feedback. Claim 1 is broad; our differentiator has to be the **recovery state machine**, not the re-slice itself.",
  },
  {
    id: "m1",
    kind: "meeting",
    title: "Weekly sync — week 4",
    author_name: "Rahul Ramkumar",
    author_email: "",
    created_at: "2026-09-22T21:00:00Z",
    meeting_date: "2026-09-22",
    category: "Systems",
    worked_with: ["Nathaniel Li", "Yang Lu", "Ethan Woo", "Neel Patel"],
    action_items: [
      { text: "Re-run thermal calibration with the new mount", owner: "Yang Lu", due: "2026-09-26", done: true },
      { text: "Draft the recovery state machine diagram", owner: "Rahul Ramkumar", due: "2026-09-27", done: false },
      { text: "Price out the 24 V supply options", owner: "Neel Patel", due: "2026-09-29", done: false },
    ],
    text:
      "## Agenda\n- Calibration results, recovery scope, power budget\n\n## Mech\n- Camera mount flexes under gantry acceleration — new bracket by Friday\n\n## EE\n- 24 V supply quote still outstanding\n\n## Embedded / Firmware / Controls\n- Driver layer freezes once the sensor suite is locked\n\n## Autonomy / Perception\n- Calibration holding within spec\n\n## Systems\n- Recovery gets its own state machine instead of living in the motion planner\n\n## Application SW\n- Live monitor needs a pause/resume control\n\n## Decisions\n- Lock the sensor suite this week\n- Recovery is a first-class subsystem\n\n## Blockers\n- Power budget blocked on the supply quote",
  },
  {
    id: "p1",
    kind: "progress",
    title: "Extrusion controller tuning pass",
    author_name: "Nathaniel Li",
    author_email: "",
    created_at: "2026-09-24T15:40:00Z",
    category: "Embedded/Firmware/Controls",
    worked_with: ["Yang Lu"],
    text: "Tuned the **extrusion controller** and reduced corner blobbing by 18 percent.\n\n- Lowered jerk on direction changes\n- Added a 12 ms pressure-release dwell\n- Next: validate on the tall-spiral test print",
  },
  {
    id: "p2",
    kind: "progress",
    title: "Camera + thermal calibration run",
    author_name: "Yang Lu",
    author_email: "",
    created_at: "2026-09-24T11:05:00Z",
    category: "Autonomy / perception",
    worked_with: ["Ethan Woo", "Neel Patel"],
    text: "Completed the camera and thermal calibration run. The current design holds layer height within `0.3 mm`.",
  },
  {
    id: "p3",
    kind: "progress",
    title: "Recovery stack wired to the live monitor",
    author_name: "Rahul Ramkumar",
    author_email: "",
    created_at: "2026-09-23T17:20:00Z",
    category: "Systems",
    text: "Connected the live print monitor to the recovery stack and added a pause-and-resume state.",
  },
];

function isErrorMessage(message: string) {
  return !/^(Published|Entry updated|Entry deleted|Entry and \d+ file|Design note published|Marked as submitted|Moved back)/i.test(
    message,
  );
}

function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function contributorsOf(entry: Pick<Entry, "author_name" | "worked_with">) {
  return Array.from(
    new Set([entry.author_name, ...(entry.worked_with || [])].filter(Boolean).map((name) => prettyName(name))),
  );
}

function toneFor(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash * 31 + name.charCodeAt(index)) % 4;
  return `c${hash}`;
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(value: string) {
  const date = parseDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatDate(value: string) {
  const date = parseDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function dayLabel(value: string) {
  const date = parseDate(value);
  if (!date) return "Recent";
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function sortValue(value: string) {
  const date = parseDate(value);
  return date ? date.getTime() : Date.now();
}

function attachmentsOf(entry: Entry): Attachment[] {
  const list = Array.isArray(entry.attachments) ? entry.attachments : [];
  const legacy: Attachment[] = [];
  if (entry.photo_url) legacy.push({ name: "Attached photo", url: entry.photo_url, family: "image" });
  if (entry.link_url) legacy.push(...parseLinks(entry.link_url));
  return [...list, ...legacy];
}

function excerpt(text: string, limit = 260) {
  const plain = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > limit ? `${plain.slice(0, limit)}…` : plain;
}

function AttachmentList({ items }: { items: Attachment[] }) {
  if (!items.length) return null;
  return (
    <div className="dl-files">
      {groupAttachments(items).map((group) => (
        <div className="dl-file-group" key={group.family}>
          <span className="dl-file-group-label">{group.label}</span>
          <div className="dl-file-row">
            {group.items.map((item) => (
              <a className="dl-file" href={item.url} target="_blank" rel="noreferrer" key={`${item.url}-${item.name}`}>
                <span className={`dl-file-badge f-${item.family}`}>{FAMILY_ICONS[item.family]}</span>
                <span className="dl-file-name">{item.name}</span>
                {item.size ? <span className="dl-file-size">{formatSize(item.size)}</span> : null}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LinkChips({
  source,
  spawned,
  onOpen,
}: {
  source?: Entry | null;
  spawned?: Entry[];
  onOpen: (id: string | number) => void;
}) {
  if (!source && !spawned?.length) return null;
  return (
    <div className="dl-links-row">
      {source && (
        <button className="dl-linkchip is-source" onClick={() => onOpen(source.id)}>
          <span className="k">From</span>
          {source.title || "linked entry"}
          <span>↗</span>
        </button>
      )}
      {spawned?.map((child) => (
        <button className="dl-linkchip" key={child.id} onClick={() => onOpen(child.id)}>
          <span className="k">{child.kind === "ideation" ? "Idea" : child.kind === "research" ? "Research" : child.kind === "meeting" ? "Meeting" : "Progress"}</span>
          {child.title || excerpt(child.text, 40)}
          <span>↗</span>
        </button>
      ))}
    </div>
  );
}

function PeopleStack({ people }: { people: string[] }) {
  return (
    <div className="dl-stack" title={people.join(", ")}>
      {people.slice(0, 4).map((person) => (
        <span className={`dl-face ${toneFor(person)}`} key={person} title={person}>
          {initials(person)}
        </span>
      ))}
      {people.length > 4 && <span className="dl-face more">+{people.length - 4}</span>}
    </div>
  );
}

function Byline({ people }: { people: string[] }) {
  const others = people.length - 1;
  return (
    <span className="dl-byline">
      <b>{people[0]}</b>
      {others > 0 && (
        <span className="dl-others" title={people.slice(1).join(", ")}>
          +{others} {others === 1 ? "other" : "others"}
        </span>
      )}
    </span>
  );
}

export default function DesignLog() {
  const [entries, setEntries] = useState<Entry[]>(fallbackEntries);
  const [tab, setTab] = useState<Kind>("progress");
  const [category, setCategory] = useState<"All" | Category>("All");
  const [resource, setResource] = useState<"All" | ResourceType>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [view, setView] = useState<"stream" | "list" | "cards">("stream");
  const [stageFilter, setStageFilter] = useState<"All" | Stage>("All");
  const [stageMenu, setStageMenu] = useState<string | number | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const [focused, setFocused] = useState<string | number | null>(null);

  const [composer, setComposer] = useState(false);
  const [draftKind, setDraftKind] = useState<Kind>("progress");
  const [draftTitle, setDraftTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState(false);
  const [taggedWith, setTaggedWith] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([{ text: "", owner: "", due: "" }]);
  const [linkedTo, setLinkedTo] = useState<Entry | null>(null);
  const [mention, setMention] = useState<{ query: string; start: number; target: "body" | "comment" } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [posting, setPosting] = useState(false);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);
  const [readerId, setReaderId] = useState<string | number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [commentBusy, setCommentBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;
  const rise = (index = 0) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
    transition: { duration: reduceMotion ? 0.15 : 0.34, delay: Math.min(index * 0.035, 0.28), ease },
  });

  const authorName = userName || (userEmail ? prettyName(userEmail) : "You");

  const counts = useMemo(
    () => ({
      ideation: entries.filter((entry) => entry.kind === "ideation").length,
      research: entries.filter((entry) => entry.kind === "research").length,
      progress: entries.filter((entry) => entry.kind === "progress").length,
      meeting: entries.filter((entry) => entry.kind === "meeting").length,
      deliverable: entries.filter((entry) => entry.kind === "deliverable").length,
    }),
    [entries],
  );

  const tabEntries = useMemo(() => entries.filter((entry) => entry.kind === tab), [entries, tab]);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tabEntries
      .filter((entry) => tab !== "research" || resource === "All" || entry.resource_type === resource)
      .filter(
        (entry) =>
          tab !== "progress" || stageFilter === "All" || (entry.stage || "Backlog") === stageFilter,
      )
      .filter((entry) => !usesDiscipline(tab) || category === "All" || entry.category === category)
      .filter(
        (entry) =>
          !needle ||
          (entry.title || "").toLowerCase().includes(needle) ||
          entry.text.toLowerCase().includes(needle) ||
          entry.category.toLowerCase().includes(needle) ||
          (entry.resource_authors || "").toLowerCase().includes(needle) ||
          (entry.resource_source || "").toLowerCase().includes(needle) ||
          (entry.action_items || []).some((item) => item.text.toLowerCase().includes(needle)) ||
          contributorsOf(entry).join(" ").toLowerCase().includes(needle),
      )
      .sort((a, b) =>
        sort === "newest"
          ? sortValue(b.created_at) - sortValue(a.created_at)
          : sortValue(a.created_at) - sortValue(b.created_at),
      );
  }, [category, query, resource, sort, stageFilter, tab, tabEntries]);

  // Render a page at a time: 500 entries in the DOM (each animated) is the
  // slow part, not the query.
  const visible = useMemo(() => matching.slice(0, shown), [matching, shown]);
  const remaining = matching.length - visible.length;

  // Any change of tab, view, or filter starts from the first page again.
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [category, query, resource, sort, stageFilter, tab, view]);

  const grouped = useMemo(() => {
    const buckets: { label: string; items: Entry[] }[] = [];
    visible.forEach((entry) => {
      const label = dayLabel(entry.created_at);
      const bucket = buckets.find((item) => item.label === label);
      if (bucket) bucket.items.push(entry);
      else buckets.push({ label, items: [entry] });
    });
    return buckets;
  }, [visible]);

  const deliverables = useMemo(
    () =>
      [...visible].sort((a, b) => {
        const left = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const right = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return left - right;
      }),
    [visible],
  );

  const nextDue = useMemo(
    () =>
      entries
        .filter((entry) => entry.kind === "deliverable" && entry.due_date && !entry.submitted_at)
        .sort((a, b) => new Date(a.due_date as string).getTime() - new Date(b.due_date as string).getTime())[0] || null,
    [entries],
  );

  const researchGroups = useMemo(() => {
    const buckets: { label: string; items: Entry[] }[] = [];
    visible.forEach((entry) => {
      const label = entry.resource_type || "Unsorted";
      const bucket = buckets.find((item) => item.label === label);
      if (bucket) bucket.items.push(entry);
      else buckets.push({ label, items: [entry] });
    });
    return buckets;
  }, [visible]);

  const stageCounts = useMemo(() => {
    const counted: Record<string, number> = { All: tabEntries.length };
    stages.forEach((option) => {
      counted[option] = tabEntries.filter((entry) => (entry.stage || "Backlog") === option).length;
    });
    return counted;
  }, [tabEntries]);

  const categoryBreakdown = useMemo(() => {
    const scoped = entries.filter((entry) => usesDiscipline(entry.kind));
    const total = scoped.length || 1;
    return categories
      .map((option) => {
        const count = scoped.filter((entry) => entry.category === option).length;
        return { option, count, pct: Math.round((count / total) * 100) };
      })
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  const contributors = useMemo(() => {
    const tally = new Map<string, number>();
    entries.forEach((entry) => contributorsOf(entry).forEach((name) => tally.set(name, (tally.get(name) || 0) + 1)));
    return Array.from(tally, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [entries]);

  const openActions = useMemo(
    () =>
      entries
        .filter((entry) => entry.kind === "meeting")
        .flatMap((entry) => entry.action_items || [])
        .filter((item) => !item.done).length,
    [entries],
  );

  const editingEntry = useMemo(
    () => (editingId === null ? null : entries.find((entry) => entry.id === editingId) || null),
    [editingId, entries],
  );

  const readerEntry = useMemo(
    () => (readerId === null ? null : entries.find((entry) => entry.id === readerId) || null),
    [entries, readerId],
  );

  const byId = useMemo(() => new Map(entries.map((entry) => [String(entry.id), entry])), [entries]);
  const childrenOf = useMemo(() => {
    const map = new Map<string, Entry[]>();
    entries.forEach((entry) => {
      if (!entry.linked_to) return;
      const key = String(entry.linked_to);
      map.set(key, [...(map.get(key) || []), entry]);
    });
    return map;
  }, [entries]);

  const libraryCount = useMemo(
    () => entries.reduce((total, entry) => total + attachmentsOf(entry).length, 0),
    [entries],
  );

  const mentionOptions = useMemo(() => {
    const needle = (mention?.query || "").trim().toLowerCase();
    const scored = entries
      .filter((entry) => String(entry.id) !== String(editingId))
      .map((entry) => {
        const label = entry.title || excerpt(entry.text, 48);
        const haystack = label.toLowerCase();
        const words = haystack.split(/\s+/);
        let score = 0;
        if (!needle) {
          score = 1; // no query yet: fall back to most recent
        } else if (haystack.startsWith(needle)) {
          score = 100;
        } else if (words.some((word) => word.startsWith(needle))) {
          score = 70;
        } else if (haystack.includes(needle)) {
          score = 40;
        } else if (entry.kind.toLowerCase().startsWith(needle)) {
          score = 25;
        } else if ((entry.category || "").toLowerCase().includes(needle)) {
          score = 15;
        }
        return {
          score,
          recency: sortValue(entry.meeting_date || entry.created_at),
          option: {
            type: "entry" as const,
            id: String(entry.id),
            label,
            kind: entry.kind,
            meta: formatDate(entry.meeting_date || entry.created_at),
          },
        };
      })
      .filter((candidate) => candidate.score > 0);

    scored.sort((a, b) => (b.score === a.score ? b.recency - a.recency : b.score - a.score));
    // Three best matches only — Tab cycles between them.
    return scored.slice(0, 3).map((candidate) => candidate.option);
  }, [editingId, entries, mention?.query]);

  const taggableMembers = useMemo(
    () =>
      Array.from(new Set([...teamNames, ...entries.map((entry) => prettyName(entry.author_name))])).filter(
        (name) => name && name !== authorName,
      ),
    [authorName, entries],
  );

  useEffect(() => {
    let active = true;
    try {
      const supabase = createSupabaseClient();
      supabase.auth.getUser().then(({ data }) => {
        if (!active) return;
        setUserEmail(data.user?.email || null);
        setUserName(data.user ? resolveDisplayName(data.user) : "");
        setUserId(data.user?.id || null);
      });
      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email || null);
        setUserName(session?.user ? resolveDisplayName(session.user) : "");
        setUserId(session?.user?.id || null);
      });
      supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          // A successful fetch is authoritative — including an empty table.
          // The sample entries are only a placeholder for an unconfigured backend.
          if (active && !error) {
            setEntries(
              (data as Entry[] | null)?.map((entry) => ({
                ...entry,
                kind: (entry.kind as Kind) || "progress",
                attachments: Array.isArray(entry.attachments) ? entry.attachments : [],
              })) ?? [],
            );
          }
          if (active) setLoading(false);
        });
      return () => {
        active = false;
        listener.data.subscription.unsubscribe();
      };
    } catch {
      setLoading(false);
      return () => {
        active = false;
      };
    }
  }, []);

  useEffect(() => {
    let active = true;
    try {
      createSupabaseClient()
        .from("entry_comments")
        .select("entry_id")
        .then(({ data, error }) => {
          if (!active || error || !data) return;
          const tally: Record<string, number> = {};
          (data as { entry_id: string | number }[]).forEach((row) => {
            const key = String(row.entry_id);
            tally[key] = (tally[key] || 0) + 1;
          });
          setCommentCounts(tally);
        });
    } catch {
      /* supabase not configured */
    }
    return () => {
      active = false;
    };
  }, [entries.length]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dl-view");
      if (saved === "stream" || saved === "list" || saved === "cards") setView(saved);
    } catch {
      /* storage blocked */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("dl-view", view);
    } catch {
      /* storage blocked */
    }
  }, [view]);

  useEffect(() => {
    if (stageMenu === null) return;
    const close = () => setStageMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [stageMenu]);

  useEffect(() => {
    if (mentionIndex >= mentionOptions.length) setMentionIndex(0);
  }, [mentionIndex, mentionOptions.length]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), isErrorMessage(message) ? 12000 : 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (readerId === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !composer) setReaderId(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      if (!composer) document.body.style.overflow = "";
    };
  }, [composer, readerId]);

  useEffect(() => {
    if (!composer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setComposer(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setPreview((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      // the reader may still be open underneath — keep the page locked if so
      document.body.style.overflow = readerId === null ? "" : "hidden";
    };
  }, [composer, readerId]);

  const messageIsError = isErrorMessage(message);

  function openComposer() {
    setEditingId(null);
    setDraftTitle("");
    setLinkedTo(null);
    setTaggedWith([]);
    setFiles([]);
    setActions([{ text: "", owner: "", due: "" }]);
    setDraftKind(tab);
    setDraft(tab === "meeting" ? MEETING_TEMPLATE : "");
    setPreview(false);
    setComposer(true);
  }

  function detectMention(value: string, caret: number, target: "body" | "comment") {
    const before = value.slice(0, caret);
    const match = /@([\w .'-]{0,40})$/.exec(before);
    if (!match) {
      setMention(null);
      return;
    }
    setMention({ query: match[1], start: caret - match[0].length, target });
    setMentionIndex(0);
  }

  function applyMention(option: { id: string; label: string }) {
    if (!mention) return;
    const token = `[[ref:${option.id}|${option.label}]] `;
    const source = mention.target === "body" ? draft : commentDraft;
    const caretEnd = mention.start + mention.query.length + 1;
    const next = source.slice(0, mention.start) + token + source.slice(caretEnd);
    if (mention.target === "body") setDraft(next);
    else setCommentDraft(next);
    setMention(null);
  }

  function mentionKeyDown(event: React.KeyboardEvent) {
    if (!mention || mentionOptions.length === 0) return;
    const step = (delta: number) =>
      setMentionIndex((current) => (current + delta + mentionOptions.length) % mentionOptions.length);

    if (event.key === "Tab") {
      // Tab cycles through the three suggestions (shift+Tab goes back).
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      applyMention(mentionOptions[mentionIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setMention(null);
    }
  }

  function renderRef(id: string, label: string) {
    const target = byId.get(String(id));
    return (
      <button
        type="button"
        className={target ? `dl-ref k-${target.kind}` : "dl-ref is-missing"}
        onClick={() => target && openReader(target)}
        title={target ? `Open ${target.kind}` : "This entry was deleted"}
      >
        {target ? (target.kind === "meeting" ? "◷" : target.kind === "research" ? "❂" : target.kind === "ideation" ? "✦" : "▸") : "⚠"}
        {target?.title || label}
      </button>
    );
  }

  function isLocalId(id: string | number) {
    return typeof id === "string" && id.startsWith("local-");
  }

  async function openReader(entry: Entry) {
    setReaderId(entry.id);
    setComments([]);
    setCommentDraft("");
    setCommentFiles([]);
    if (isLocalId(entry.id)) return;
    try {
      const { data, error } = await createSupabaseClient()
        .from("entry_comments")
        .select("*")
        .eq("entry_id", entry.id)
        .order("created_at", { ascending: true });
      if (!error && data) setComments(data as Comment[]);
    } catch {
      /* supabase not configured — reader still works read-only */
    }
  }

  async function postComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!readerEntry) return;
    if (!userEmail) {
      setMessage("Sign in to add a note.");
      return;
    }
    const links = parseLinks(String(new FormData(formElement).get("commentLinks") || ""));
    const text = commentDraft.trim();
    if (!text && !commentFiles.length && !links.length) return;

    setCommentBusy(true);
    try {
      const supabase = createSupabaseClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your session expired. Please sign in again.");

      const uploaded: Attachment[] = [];
      for (const file of commentFiles) {
        if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name} is larger than 25 MB.`);
        const path = `${auth.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from("design-files").upload(path, file);
        if (uploadError) throw uploadError;
        uploaded.push({
          name: file.name,
          url: supabase.storage.from("design-files").getPublicUrl(path).data.publicUrl,
          family: familyOf(file.name),
          size: file.size,
        });
      }

      const comment = {
        entry_id: readerEntry.id,
        user_id: auth.user.id,
        author_name: resolveDisplayName(auth.user),
        author_email: auth.user.email || userEmail,
        text,
        attachments: [...uploaded, ...links],
      };
      const { data, error } = await supabase.from("entry_comments").insert(comment).select().single();
      if (error) throw error;

      setComments((current) => [
        ...current,
        (data as Comment) || { ...comment, id: `local-${Date.now()}`, created_at: new Date().toISOString() },
      ]);
      setCommentCounts((current) => ({
        ...current,
        [String(readerEntry.id)]: (current[String(readerEntry.id)] || 0) + 1,
      }));
      setCommentDraft("");
      setCommentFiles([]);
      formElement.reset();
    } catch (error) {
      const supabaseError = error as { code?: string; message?: string };
      setMessage(
        supabaseError.code === "42P01"
          ? "The entry_comments table is missing. Run supabase/schema.sql, then try again."
          : supabaseError.message || "Could not add that note.",
      );
    } finally {
      setCommentBusy(false);
    }
  }

  async function deleteComment(comment: Comment) {
    const snapshot = comments;
    setComments((current) => current.filter((item) => item.id !== comment.id));
    setCommentCounts((current) => ({
      ...current,
      [String(comment.entry_id)]: Math.max((current[String(comment.entry_id)] || 1) - 1, 0),
    }));
    try {
      const { data, error } = await createSupabaseClient()
        .from("entry_comments")
        .delete()
        .eq("id", comment.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Row level security blocked that delete. Run supabase/schema.sql and make sure you wrote this note.");
      }
      const paths = storagePathsOf(Array.isArray(comment.attachments) ? comment.attachments : []);
      if (paths.length) await createSupabaseClient().storage.from(STORAGE_BUCKET).remove(paths);
    } catch (error) {
      setComments(snapshot);
      setCommentCounts((current) => ({
        ...current,
        [String(comment.entry_id)]: (current[String(comment.entry_id)] || 0) + 1,
      }));
      setMessage((error as { message?: string }).message || "Could not delete that note.");
    }
  }

  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setDraftKind(entry.kind);
    setDraftTitle(entry.title || "");
    setDraft(entry.text);
    setTaggedWith((entry.worked_with || []).map((name) => prettyName(name)));
    setActions(entry.action_items?.length ? entry.action_items : [{ text: "", owner: "", due: "" }]);
    setLinkedTo(entry.linked_to ? byId.get(String(entry.linked_to)) || null : null);
    setFiles([]);
    setPreview(false);
    setComposer(true);
  }

  async function setStage(entry: Entry, stage: Stage) {
    setStageMenu(null);
    if (!userEmail) {
      setMessage("Sign in to move this entry.");
      return;
    }
    if ((entry.stage || "Backlog") === stage) return;
    const previous = entry.stage ?? null;
    setEntries((current) => current.map((item) => (item.id === entry.id ? { ...item, stage } : item)));
    try {
      const supabase = createSupabaseClient();
      // RPC so any teammate can move the card without write access to the text.
      const { error } = await supabase.rpc("set_entry_stage", { entry: String(entry.id), next_stage: stage });
      if (error) {
        if (error.code === "PGRST202" || error.code === "42883") {
          const fallback = await supabase.from("activity_logs").update({ stage }).eq("id", entry.id);
          if (fallback.error) throw fallback.error;
        } else {
          throw error;
        }
      }
    } catch (error) {
      setEntries((current) => current.map((item) => (item.id === entry.id ? { ...item, stage: previous } : item)));
      const supabaseError = error as { code?: string; message?: string };
      setMessage(
        supabaseError.code === "42703" || supabaseError.code === "PGRST204"
          ? "Your activity_logs table has no \"stage\" column. Run supabase/add-stage.sql, then try again."
          : supabaseError.message || "Could not move that entry.",
      );
    }
  }

  function StagePill({ entry, compact = false }: { entry: Entry; compact?: boolean }) {
    const current = (entry.stage || "Backlog") as Stage;
    const open = stageMenu === entry.id;
    return (
      <span className={compact ? "dl-stagewrap is-compact" : "dl-stagewrap"}>
        <button
          type="button"
          className={`dl-stage s-${stageClass(current)}`}
          onClick={(event) => {
            event.stopPropagation();
            setStageMenu(open ? null : entry.id);
          }}
          title={userEmail ? "Change stage" : "Sign in to change the stage"}
        >
          <i />
          {current}
          <b>▾</b>
        </button>
        {open && (
          <motion.span
            className="dl-stage-menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            onClick={(event) => event.stopPropagation()}
          >
            {stages.map((option) => (
              <button
                type="button"
                key={option}
                className={option === current ? "is-on" : ""}
                onClick={() => setStage(entry, option)}
              >
                <i className={`s-${stageClass(option)}`} />
                {option}
              </button>
            ))}
          </motion.span>
        )}
      </span>
    );
  }

  async function toggleSubmitted(entry: Entry) {
    if (!ownsEntry(entry)) {
      setMessage("Only the owner of this deliverable can mark it submitted.");
      return;
    }
    const next = entry.submitted_at ? null : new Date().toISOString();
    setEntries((current) =>
      current.map((item) => (item.id === entry.id ? { ...item, submitted_at: next } : item)),
    );
    try {
      const { error } = await createSupabaseClient()
        .from("activity_logs")
        .update({ submitted_at: next })
        .eq("id", entry.id);
      if (error) throw error;
      setMessage(next ? "Marked as submitted." : "Moved back to in progress.");
    } catch (error) {
      setEntries((current) =>
        current.map((item) => (item.id === entry.id ? { ...item, submitted_at: entry.submitted_at } : item)),
      );
      setMessage((error as { message?: string }).message || "Could not update that deliverable.");
    }
  }

  function dueMeta(entry: Entry) {
    if (entry.submitted_at) return { label: `Submitted ${formatDate(entry.submitted_at)}`, tone: "done" };
    if (!entry.due_date) return { label: "No due date", tone: "none" };
    const due = new Date(entry.due_date);
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOf(due) - startOf(new Date())) / 86_400_000);
    if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, tone: "late" };
    if (days === 0) return { label: "Due today", tone: "soon" };
    if (days <= 7) return { label: `Due in ${days}d`, tone: "soon" };
    return { label: `Due ${formatDate(entry.due_date)}`, tone: "ok" };
  }

  function ownsEntry(entry: Entry) {
    if (!userEmail) return false;
    if (entry.user_id && userId) return entry.user_id === userId;
    return Boolean(entry.author_email) && entry.author_email === userEmail;
  }

  function ownsComment(comment: Comment) {
    if (!userEmail) return false;
    if (comment.user_id && userId) return comment.user_id === userId;
    return Boolean(comment.author_email) && comment.author_email === userEmail;
  }

  async function deleteEntry(entry: Entry) {
    if (isLocalId(entry.id)) {
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      return;
    }
    if (confirmDelete !== entry.id) {
      setConfirmDelete(entry.id);
      setTimeout(() => setConfirmDelete((current) => (current === entry.id ? null : current)), 4000);
      return;
    }
    setConfirmDelete(null);
    if (readerId === entry.id) setReaderId(null);
    const snapshot = entries;
    setEntries((current) =>
      current
        .filter((item) => item.id !== entry.id)
        .map((item) => (String(item.linked_to) === String(entry.id) ? { ...item, linked_to: null } : item)),
    );
    try {
      const supabase = createSupabaseClient();

      // Collect every uploaded file owned by this entry *before* the row goes,
      // including files attached to its comments (those rows cascade away).
      let paths = storagePathsOf(attachmentsOf(entry));
      try {
        const { data: threadFiles } = await supabase
          .from("entry_comments")
          .select("attachments")
          .eq("entry_id", entry.id);
        (threadFiles as { attachments?: Attachment[] }[] | null)?.forEach((row) => {
          paths = paths.concat(storagePathsOf(Array.isArray(row.attachments) ? row.attachments : []));
        });
      } catch {
        /* comments table may not exist yet — entry files are still cleaned up */
      }

      // .select() makes Postgres return the deleted rows, so we can tell a real
      // delete apart from an RLS no-op (which otherwise "succeeds" with 0 rows).
      const { data, error } = await supabase.from("activity_logs").delete().eq("id", entry.id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Supabase accepted the request but deleted nothing — the row is protected by row level security. Run supabase/schema.sql so authors can delete their own entries (and check this entry has your user_id).",
        );
      }
      // Row is gone — now bin the files. A storage failure must not resurrect the entry.
      let orphaned = 0;
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
        if (storageError) orphaned = paths.length;
      }
      setMessage(
        orphaned
          ? `Entry deleted, but ${orphaned} file${orphaned === 1 ? "" : "s"} stayed in storage. Run supabase/storage-cleanup.sql to allow file deletes.`
          : paths.length
            ? `Entry and ${paths.length} file${paths.length === 1 ? "" : "s"} deleted.`
            : "Entry deleted.",
      );
    } catch (error) {
      setEntries(snapshot);
      if (readerId === entry.id || readerEntry?.id === entry.id) setReaderId(entry.id);
      const supabaseError = error as { code?: string; message?: string };
      setMessage(
        supabaseError.code === "42501"
          ? "Supabase blocked the delete. Run supabase/schema.sql to add the author delete policy."
          : supabaseError.message || "Could not delete that entry.",
      );
    }
  }

  function DeleteButton({ entry }: { entry: Entry }) {
    if (!ownsEntry(entry)) return null;
    const armed = confirmDelete === entry.id;
    return (
      <button
        type="button"
        className={armed ? "dl-delete is-armed" : "dl-delete"}
        onClick={() => deleteEntry(entry)}
        title="Delete this entry"
      >
        {armed ? "Confirm delete?" : "Delete"}
      </button>
    );
  }

  function goToEntry(id: string | number) {
    const target = byId.get(String(id));
    if (!target) return;
    setTab(target.kind);
    setExpanded(id);
    setFocused(id);
    setTimeout(() => {
      document.getElementById(`entry-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    setTimeout(() => setFocused(null), 2600);
  }

  function spinOff(source: Entry, kind: Kind) {
    if (!userEmail) {
      setMessage("Sign in to spin this into a new entry.");
      return;
    }
    setEditingId(null);
    setLinkedTo(source);
    setDraftKind(kind);
    setDraftTitle("");
    setDraft(
      kind === "ideation"
        ? `## The premise\n\nCame out of ${source.title || "the weekly sync"}.\n\n`
        : "",
    );
    setTaggedWith(contributorsOf(source).filter((name) => name !== authorName));
    setActions([{ text: "", owner: "", due: "" }]);
    setPreview(false);
    setComposer(true);
  }

  function toggleTag(name: string) {
    setTaggedWith((current) =>
      current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name],
    );
  }

  function updateAction(index: number, patch: Partial<ActionItem>) {
    setActions((current) => current.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  }

  function addActionRow() {
    setActions((current) => [...current, { text: "", owner: "", due: "" }]);
  }

  function removeActionRow(index: number) {
    setActions((current) => (current.length === 1 ? current : current.filter((_, position) => position !== index)));
  }

  async function toggleActionItem(entryId: string | number, index: number) {
    const target = entries.find((entry) => entry.id === entryId);
    if (!target) return;
    if (isLocalId(entryId)) {
      setMessage("Refresh the page before ticking off items on a just-published meeting.");
      return;
    }
    if (!userEmail) {
      setMessage("Sign in to tick off action items.");
      return;
    }
    const next = (target.action_items || []).map((item, position) =>
      position === index ? { ...item, done: !item.done } : item,
    );
    setEntries((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, action_items: next } : entry)),
    );
    try {
      const supabase = createSupabaseClient();
      // Teammates toggle through an RPC so they can never overwrite the author's text.
      const { error } = await supabase.rpc("toggle_action_item", { entry: String(entryId), idx: index });
      if (error) {
        if (error.code === "PGRST202" || error.code === "42883") {
          const fallback = await supabase.from("activity_logs").update({ action_items: next }).eq("id", entryId);
          if (fallback.error) throw fallback.error;
        } else {
          throw error;
        }
      }
    } catch (error) {
      setEntries((current) =>
        current.map((entry) => (entry.id === entryId ? { ...entry, action_items: target.action_items } : entry)),
      );
      setMessage((error as { message?: string }).message || "Could not save that action item.");
    }
  }

  async function logout() {
    try {
      await createSupabaseClient().auth.signOut();
      setUserEmail(null);
      setUserName("");
      setUserId(null);
    } catch {
      setMessage("Unable to sign out.");
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!userEmail) {
      setMessage("Sign in with your crew account before posting.");
      setComposer(false);
      return;
    }
    const form = new FormData(formElement);
    const text = draft.trim();
    const title = draftTitle.trim();
    const entryCategory = (usesDiscipline(draftKind)
      ? String(form.get("category") || "")
      : NO_DISCIPLINE) as Category;
    const resourceType = String(form.get("resourceType") || "") as ResourceType;
    const resourceAuthors = String(form.get("resourceAuthors") || "").trim() || null;
    const resourceSource = String(form.get("resourceSource") || "").trim() || null;
    const resourceYearRaw = String(form.get("resourceYear") || "").trim();
    const links = parseLinks(String(form.get("links") || ""));
    const meetingDate = String(form.get("meetingDate") || "").trim() || null;
    const deliverableType = String(form.get("deliverableType") || "").trim() || null;
    const dueDate = String(form.get("dueDate") || "").trim() || null;
    const cleanActions = actions
      .map((item) => ({ ...item, text: item.text.trim(), owner: item.owner || authorName, due: item.due || null }))
      .filter((item) => item.text);

    if (draftKind === "meeting" && !meetingDate) {
      setMessage("Pick the meeting date.");
      return;
    }
    if (draftKind === "deliverable" && !title) {
      setMessage("Name the deliverable (e.g. \"Project proposal\").");
      return;
    }
    if (draftKind !== "progress" && draftKind !== "meeting" && !title) {
      setMessage(draftKind === "research" ? "Give the resource a title." : "Give the idea a title.");
      return;
    }
    if (!text && draftKind !== "research" && draftKind !== "deliverable") {
      setMessage("Write something before publishing.");
      return;
    }
    if (usesDiscipline(draftKind) && !categories.includes(entryCategory)) return;

    setPosting(true);
    try {
      const supabase = createSupabaseClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMessage("Your session expired. Please sign in again.");
        setComposer(false);
        return;
      }

      const uploaded: Attachment[] = [];
      for (const file of files) {
        if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name} is larger than 25 MB.`);
        const path = `${auth.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from("design-files").upload(path, file);
        if (uploadError) throw uploadError;
        uploaded.push({
          name: file.name,
          url: supabase.storage.from("design-files").getPublicUrl(path).data.publicUrl,
          family: familyOf(file.name),
          size: file.size,
        });
      }

      const creator = resolveDisplayName(auth.user);
      const attachments = [...uploaded, ...links];
      const entry: Omit<Entry, "id"> & { user_id: string } = {
        user_id: auth.user.id,
        kind: draftKind,
        title:
          title ||
          (draftKind === "meeting" && meetingDate
            ? `Weekly sync — ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(meetingDate))}`
            : null),
        author_name: creator,
        author_email: auth.user.email || userEmail,
        text,
        created_at: new Date().toISOString(),
        category: entryCategory,
        worked_with: taggedWith.filter((name) => name !== creator),
        attachments,
        photo_url: null,
        link_url: links[0]?.url || null,
        resource_type: draftKind === "research" ? resourceType || "Paper" : null,
        resource_authors: draftKind === "research" ? resourceAuthors : null,
        resource_source: draftKind === "research" ? resourceSource : null,
        resource_year: draftKind === "research" && resourceYearRaw ? Number(resourceYearRaw) : null,
        linked_to: linkedTo ? linkedTo.id : null,
        stage: draftKind === "progress" ? ((String(form.get("stage") || "Backlog") as Stage) || "Backlog") : null,
        meeting_date: draftKind === "meeting" ? meetingDate : null,
        deliverable_type: draftKind === "deliverable" ? ((deliverableType as DeliverableType) || "Other") : null,
        due_date: draftKind === "deliverable" ? dueDate : null,
        submitted_at: draftKind === "deliverable" ? (editingEntry?.submitted_at ?? null) : null,
        action_items: draftKind === "meeting" ? cleanActions : [],
      };

      const { created_at: _createdAt, user_id: _userId, ...editable } = entry;

      if (editingId !== null) {
        const existing = entries.find((item) => item.id === editingId);
        const mergedAttachments = [...(existing?.attachments || []), ...attachments];
        const { error } = await supabase
          .from("activity_logs")
          .update({ ...editable, attachments: mergedAttachments })
          .eq("id", editingId);
        if (error) throw error;
        setEntries((current) =>
          current.map((item) =>
            item.id === editingId
              ? { ...item, ...editable, attachments: mergedAttachments, created_at: item.created_at }
              : item,
          ),
        );
        setMessage("Entry updated.");
      } else {
        // Ask Postgres for the stored row so we use its REAL primary key.
        // Fabricating a UUID here breaks tables whose id column is a bigint.
        const { data, error } = await supabase
          .from("activity_logs")
          .insert({ ...editable, user_id: auth.user.id })
          .select()
          .single();
        if (error) throw error;
        const saved = (data as Entry | null) ?? null;
        setEntries([
          saved
            ? { ...entry, ...saved, attachments: Array.isArray(saved.attachments) ? saved.attachments : attachments }
            : { ...entry, id: `local-${Date.now()}` },
          ...entries,
        ]);
        setMessage("Published to the design log.");
      }

      setTab(draftKind);
      setComposer(false);
      setEditingId(null);
      setDraft("");
      setDraftTitle("");
      setTaggedWith([]);
      setFiles([]);
      setActions([{ text: "", owner: "", due: "" }]);
      setLinkedTo(null);
      formElement.reset();
    } catch (error) {
      const supabaseError = error as { code?: string; message?: string };
      if (supabaseError.code === "42501") {
        setMessage("Supabase is blocking this post. Add an INSERT policy for authenticated users on activity_logs.");
      } else if (supabaseError.code === "42703" || supabaseError.code === "PGRST204") {
        // Surface WHICH column is missing and which migration adds it.
        const missing = /'([^']+)'|column "([^"]+)"/.exec(supabaseError.message || "");
        const name = missing?.[1] || missing?.[2] || "";
        const migrations: Record<string, string> = {
          deliverable_type: "supabase/add-deliverables.sql",
          due_date: "supabase/add-deliverables.sql",
          submitted_at: "supabase/add-deliverables.sql",
          stage: "supabase/add-stage.sql",
        };
        const file = migrations[name] || "supabase/schema.sql";
        setMessage(
          name
            ? `Your activity_logs table has no "${name}" column. Run ${file} in the Supabase SQL editor, then try again.`
            : `Your activity_logs table is missing a column this entry needs. Run ${file}, then try again.`,
        );
      } else {
        setMessage(supabaseError.message || "Unable to publish this entry.");
      }
    } finally {
      setPosting(false);
    }
  }

  const draftContributors = Array.from(new Set([authorName, ...taggedWith]));
  const activeTab = tabs.find((item) => item.key === tab) as (typeof tabs)[number];

  return (
    <main className="dl-root">
      <header className="dl-topbar">
        <div className="dl-shell dl-topbar-inner">
          <a className="dl-brand" href="/">
            <span className="dl-brand-mark">MTE</span>
            <span>MTE Capstone</span>
          </a>
          <nav className="dl-nav">
            <a href="/">Mission</a>
            <a className="is-active" href="/activity">
              Design log
            </a>
            <a href="/team">Team</a>
          </nav>
          <div className="dl-topbar-right">
            <ThemeToggle theme={theme} setTheme={setTheme} className="theme-switch dl-theme" />
            {userEmail ? (
              <>
                <span className="dl-whoami" title={userEmail}>
                  Signed in · <b>{authorName}</b>
                </span>
                <button className="dl-btn dl-btn-ghost" onClick={logout}>
                  Log out
                </button>
                <button className="dl-btn dl-btn-primary" onClick={openComposer}>
                  + New entry
                </button>
              </>
            ) : (
              <a className="dl-btn dl-btn-primary" href="/login">
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="dl-shell dl-hero">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="dl-eyebrow">
            <span className="dl-dot" /> Live design log · Rev {String(entries.length).padStart(3, "0")}
          </span>
          <div className="dl-hero-grid">
            <div>
              <h1>
                Ideas, evidence,
                <br />
                <em>and everything built.</em>
              </h1>
              <p>
                The MTE Capstone design record, split into three streams: where the ideas come from, what the
                literature says, and what we actually built today.
              </p>
            </div>
            <motion.div
              className="dl-hero-meta"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06, delayChildren: 0.1 } } }}
            >
              <motion.div variants={{ hidden: { opacity: 0, x: reduceMotion ? 0 : 12 }, visible: { opacity: 1, x: 0 } }}>
                <span>Ideation</span>
                <b>{counts.ideation}</b>
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, x: reduceMotion ? 0 : 12 }, visible: { opacity: 1, x: 0 } }}>
                <span>Research</span>
                <b>{counts.research}</b>
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, x: reduceMotion ? 0 : 12 }, visible: { opacity: 1, x: 0 } }}>
                <span>Progress</span>
                <b>{counts.progress}</b>
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, x: reduceMotion ? 0 : 12 }, visible: { opacity: 1, x: 0 } }}>
                <span>Files & links</span>
                <b>{libraryCount}</b>
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, x: reduceMotion ? 0 : 12 }, visible: { opacity: 1, x: 0 } }}>
                <span>Open actions</span>
                <b>{openActions}</b>
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, x: reduceMotion ? 0 : 12 }, visible: { opacity: 1, x: 0 } }}>
                <span>Next due</span>
                <b className="accent">{nextDue?.due_date ? formatDate(nextDue.due_date) : "—"}</b>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <div className="dl-tabs">
        <div className="dl-shell dl-tabs-inner">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={tab === item.key ? "dl-tab is-on" : "dl-tab"}
              onClick={() => {
                setTab(item.key);
                setExpanded(null);
              }}
            >
              <b>{item.label}</b>
              <span>{counts[item.key]}</span>
              {tab === item.key && (
                <motion.i
                  className="dl-tab-rail"
                  layoutId="dl-tab-rail"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </button>
          ))}
          <p className="dl-tab-blurb">{activeTab.blurb}</p>
        </div>
      </div>

      <div className="dl-deck">
        <div className="dl-shell dl-deck-inner">
          <label className="dl-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${activeTab.label.toLowerCase()}`}
              aria-label="Search design log"
            />
          </label>

          {tab === "progress" && (
            <div className="dl-chips" role="group" aria-label="Filter by stage">
              {(["All", ...stages] as const).map((option) => (
                <button
                  key={option}
                  className={stageFilter === option ? "dl-chip is-on" : "dl-chip"}
                  onClick={() => setStageFilter(option)}
                >
                  {option}
                  <b>{stageCounts[option] ?? 0}</b>
                </button>
              ))}
            </div>
          )}

          {tab === "research" && (
            <div className="dl-chips" role="group" aria-label="Filter by resource type">
              {(["All", ...resourceTypes] as const).map((option) => (
                <button
                  key={option}
                  className={resource === option ? "dl-chip is-on" : "dl-chip"}
                  onClick={() => setResource(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <div className="dl-deck-right">
            {usesDiscipline(tab) && (
              <select
                className="dl-select"
                value={category}
                onChange={(event) => setCategory(event.target.value as "All" | Category)}
                aria-label="Filter by discipline"
              >
                <option value="All">All disciplines</option>
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            <div className="dl-viewpick" role="group" aria-label="View">
              {([
                ["stream", "Stream", "M3 5h18M3 12h18M3 19h18"],
                ["list", "List", "M4 6h16M4 12h16M4 18h16"],
                ["cards", "Cards", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"],
              ] as const).map(([key, label, path]) => (
                <button
                  key={key}
                  type="button"
                  className={view === key ? "is-on" : ""}
                  onClick={() => setView(key)}
                  title={`${label} view`}
                  aria-pressed={view === key}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d={path} />
                  </svg>
                  <em>{label}</em>
                </button>
              ))}
            </div>
            <select
              className="dl-select"
              value={sort}
              onChange={(event) => setSort(event.target.value as "newest" | "oldest")}
              aria-label="Sort entries"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      </div>

      <div className="dl-shell dl-body">
        <section>
          <div className="dl-section-head">
            <div>
              <span className="dl-kicker">
                {tab === "ideation"
                  ? "Concept stream"
                  : tab === "research"
                    ? "Reference library"
                    : tab === "meeting"
                      ? "Team sync"
                      : tab === "deliverable"
                        ? "Course deliverables"
                        : "Design control"}
              </span>
              <h2>
                {tab === "ideation"
                  ? "Ideation posts"
                  : tab === "research"
                    ? "Research shelf"
                    : tab === "meeting"
                      ? "Meeting minutes"
                      : tab === "deliverable"
                        ? "Submissions & due dates"
                        : "Entry timeline"}
              </h2>
            </div>
            <span className="dl-count">
              {visible.length} of {matching.length}
              {matching.length !== tabEntries.length ? ` (filtered from ${tabEntries.length})` : ""} shown
            </span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${tab}-${view}`}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.24, ease }}
            >
          {loading && (
            <div className="dl-skeleton" aria-hidden>
              <div />
              <div />
              <div />
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="dl-empty">
              <strong>Nothing here yet</strong>
              <p>
                {tab === "ideation"
                  ? "Write the first concept post — long-form is encouraged."
                  : tab === "research"
                    ? "Add the first patent, paper, or datasheet to the shelf."
                    : tab === "meeting"
                      ? "Log the first weekly meeting — agenda, decisions, and action items."
                      : tab === "deliverable"
                        ? "Add the project proposal, a report, or an upcoming presentation."
                      : "Log the first build update, or clear your filters."}
              </p>
            </div>
          )}

          {/* ---------------- LIST VIEW ---------------- */}
          {!loading && view === "list" && visible.length > 0 && (
            <div className="dl-list">
              <div className="dl-list-head">
                <span>Stream</span>
                <span>Title</span>
                <span>Stage</span>
                <span>Discipline</span>
                <span>People</span>
                <span>Date</span>
              </div>
              {visible.map((entry, index) => {
                const people = contributorsOf(entry);
                const fileCount = attachmentsOf(entry).length;
                return (
                  <motion.div
                    {...rise(index)}
                    role="button"
                    tabIndex={0}
                    className={`dl-listrow${focused === entry.id ? " is-focused" : ""}`}
                    id={`entry-${entry.id}`}
                    key={entry.id}
                    onClick={() => openReader(entry)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openReader(entry);
                      }
                    }}
                  >
                    <span className={`dl-mention-kind k-${entry.kind}`}>{entry.kind}</span>
                    <span className="dl-listrow-title">
                      {entry.title || excerpt(entry.text, 70)}
                      {fileCount > 0 && <i className="dl-listrow-files">{fileCount} files</i>}
                      {commentCounts[String(entry.id)] ? (
                        <i className="dl-listrow-files">{commentCounts[String(entry.id)]} notes</i>
                      ) : null}
                    </span>
                    {entry.kind === "progress" ? <StagePill entry={entry} compact /> : <span />}
                    {usesDiscipline(entry.kind) ? (
                      <span className="dl-tag">{entry.category}</span>
                    ) : (
                      <span />
                    )}
                    <PeopleStack people={people} />
                    <span className="dl-listrow-date">{formatDate(entry.meeting_date || entry.created_at)}</span>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ---------------- CARD VIEW ---------------- */}
          {!loading && view === "cards" && visible.length > 0 && (
            <div className="dl-cards">
              {visible.map((entry, index) => {
                const people = contributorsOf(entry);
                const files = attachmentsOf(entry);
                return (
                  <motion.article
                    className={`dl-gcard${focused === entry.id ? " is-focused" : ""}`}
                    id={`entry-${entry.id}`}
                    key={entry.id}
                    layout
                    whileHover={reduceMotion ? undefined : { y: -4 }}
                    {...rise(index)}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest(".dl-stagewrap")) return;
                      openReader(entry);
                    }}
                  >
                    <div className="dl-gcard-top">
                      <span className={`dl-mention-kind k-${entry.kind}`}>{entry.kind}</span>
                      <span className="dl-listrow-date">{formatDate(entry.meeting_date || entry.created_at)}</span>
                    </div>
                    <h3>{entry.title || excerpt(entry.text, 60)}</h3>
                    <p>{excerpt(entry.text, 150)}</p>
                    <div className="dl-gcard-foot">
                      <PeopleStack people={people} />
                      {entry.kind === "progress" && <StagePill entry={entry} compact />}
                      {usesDiscipline(entry.kind) && <span className="dl-tag">{entry.category}</span>}
                      {files.length > 0 && <span className="dl-notecount">{files.length} files</span>}
                      {commentCounts[String(entry.id)] ? (
                        <span className="dl-notecount">{commentCounts[String(entry.id)]} notes</span>
                      ) : null}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          {/* ---------------- IDEATION ---------------- */}
          {!loading && view === "stream" && tab === "ideation" && (
            <div className="dl-posts">
              <AnimatePresence mode="popLayout">
                {visible.map((entry, index) => {
                  const people = contributorsOf(entry);
                  const open = expanded === entry.id;
                  return (
                    <motion.article
                      className={`dl-post${open ? " is-open" : ""}${focused === entry.id ? " is-focused" : ""}`}
                      id={`entry-${entry.id}`}
                      key={entry.id}
                      layout
                      {...rise(index)}
                    >
                      <div className="dl-post-rail">
                        <span className="dl-post-date">{formatDate(entry.created_at)}</span>
                      </div>
                      <div className="dl-post-main">
                        <h3>
                          <button type="button" className="dl-open-title" onClick={() => openReader(entry)}>
                            {entry.title || excerpt(entry.text, 60)}
                          </button>
                        </h3>
                        {open ? (
                          <Markdown text={entry.text} renderRef={renderRef} />
                        ) : (
                          <p className="dl-post-excerpt">{excerpt(entry.text)}</p>
                        )}
                        <AttachmentList items={attachmentsOf(entry)} />
                        <LinkChips
                          source={entry.linked_to ? byId.get(String(entry.linked_to)) : null}
                          spawned={childrenOf.get(String(entry.id))}
                          onOpen={goToEntry}
                        />
                        <div className="dl-post-foot">
                          <PeopleStack people={people} />
                          <Byline people={people} />
                          <button className="dl-readmore" onClick={() => openReader(entry)}>
                            Read post <span>↗</span>
                          </button>
                          {commentCounts[String(entry.id)] ? (
                            <span className="dl-notecount">{commentCounts[String(entry.id)]} notes</span>
                          ) : null}
                          <DeleteButton entry={entry} />
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* ---------------- RESEARCH ---------------- */}
          {!loading &&
            view === "stream" &&
            tab === "research" &&
            researchGroups.map((group) => (
              <div className="dl-shelf" key={group.label}>
                <div className="dl-shelf-head">
                  <span>{group.label}</span>
                  <i />
                  <span>
                    {group.items.length} {group.items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <AnimatePresence mode="popLayout">
                  {group.items.map((entry) => {
                    const people = contributorsOf(entry);
                    const open = expanded === entry.id;
                    return (
                      <motion.article
                        className={`dl-resource${focused === entry.id ? " is-focused" : ""}`}
                        id={`entry-${entry.id}`}
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <span className={`dl-res-type t-${(entry.resource_type || "other").toLowerCase()}`}>
                          {entry.resource_type || "Ref"}
                        </span>
                        <div className="dl-res-main">
                          <h3>
                            <button type="button" className="dl-open-title" onClick={() => openReader(entry)}>
                              {entry.title || excerpt(entry.text, 70)}
                            </button>
                          </h3>
                          <div className="dl-res-meta">
                            {entry.resource_authors && <span>{entry.resource_authors}</span>}
                            {entry.resource_source && <span>{entry.resource_source}</span>}
                            {entry.resource_year && <span>{entry.resource_year}</span>}
                            <span className="dl-tag">{entry.category}</span>
                          </div>
                          {entry.text && (
                            <div className="dl-res-note">
                              {open ? <Markdown text={entry.text} renderRef={renderRef} /> : <p>{excerpt(entry.text, 190)}</p>}
                            </div>
                          )}
                          <AttachmentList items={attachmentsOf(entry)} />
                          <LinkChips
                            source={entry.linked_to ? byId.get(String(entry.linked_to)) : null}
                            spawned={childrenOf.get(String(entry.id))}
                            onOpen={goToEntry}
                          />
                          <div className="dl-res-foot">
                            <PeopleStack people={people} />
                            <span className="dl-res-added">Added by {people[0]} · {formatDate(entry.created_at)}</span>
                            <button className="dl-readmore" onClick={() => openReader(entry)}>
                              Open <span>↗</span>
                            </button>
                            {commentCounts[String(entry.id)] ? (
                              <span className="dl-notecount">{commentCounts[String(entry.id)]} notes</span>
                            ) : null}
                            <DeleteButton entry={entry} />
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}

          {/* ---------------- MEETINGS ---------------- */}
          {!loading &&
            view === "stream" &&
            tab === "meeting" &&
            visible.map((entry) => {
              const people = contributorsOf(entry);
              const items = entry.action_items || [];
              const doneCount = items.filter((item) => item.done).length;
              const open = expanded === entry.id;
              return (
                <motion.article
                  className={`dl-meeting${focused === entry.id ? " is-focused" : ""}`}
                  id={`entry-${entry.id}`}
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="dl-meeting-head">
                    <div className="dl-meeting-when">
                      <span className="d">{formatDate(entry.meeting_date || entry.created_at)}</span>
                      <button type="button" className="dl-open-title is-heading" onClick={() => openReader(entry)}>
                        {entry.title || "Weekly sync"}
                      </button>
                    </div>
                    <div className="dl-meeting-people">
                      <PeopleStack people={people} />
                      <span className="dl-res-added">
                        {people.length} {people.length === 1 ? "attendee" : "attendees"} · minutes by {people[0]}
                      </span>
                    </div>
                  </div>

                  <div className="dl-meeting-body">
                    {open || entry.text.length < 420 ? (
                      <Markdown text={entry.text} renderRef={renderRef} />
                    ) : (
                      <p className="dl-post-excerpt">{excerpt(entry.text, 320)}</p>
                    )}
                    <button className="dl-readmore" onClick={() => openReader(entry)}>
                      Full minutes <span>↗</span>
                    </button>
                    {commentCounts[String(entry.id)] ? (
                      <span className="dl-notecount">{commentCounts[String(entry.id)]} notes</span>
                    ) : null}
                  </div>

                  {items.length > 0 && (
                    <div className="dl-actions">
                      <div className="dl-actions-head">
                        <span>Action items</span>
                        <i />
                        <span>
                          {doneCount}/{items.length} done
                        </span>
                      </div>
                      {items.map((item, index) => (
                        <button
                          type="button"
                          className={item.done ? "dl-action is-done" : "dl-action"}
                          key={`${entry.id}-${index}`}
                          onClick={() => toggleActionItem(entry.id, index)}
                          title={userEmail ? "Toggle complete" : "Sign in to tick this off"}
                        >
                          <span className="dl-check">{item.done ? "✓" : ""}</span>
                          <span className="dl-action-text">{item.text}</span>
                          {item.owner && (
                            <span className={`dl-face ${toneFor(item.owner)}`} title={item.owner}>
                              {initials(item.owner)}
                            </span>
                          )}
                          {item.due && <span className="dl-action-due">{formatDate(item.due)}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  <AttachmentList items={attachmentsOf(entry)} />

                  <div className="dl-meeting-foot">
                    <LinkChips
                      source={entry.linked_to ? byId.get(String(entry.linked_to)) : null}
                      spawned={childrenOf.get(String(entry.id))}
                      onOpen={goToEntry}
                    />
                    {userEmail && (
                      <div className="dl-spinoff">
                        <span>Spin off</span>
                        <button type="button" onClick={() => spinOff(entry, "ideation")}>
                          → Ideation post
                        </button>
                        <button type="button" onClick={() => spinOff(entry, "research")}>
                          → Research item
                        </button>
                        <button type="button" onClick={() => spinOff(entry, "progress")}>
                          → Progress entry
                        </button>
                      </div>
                    )}
                    <DeleteButton entry={entry} />
                  </div>
                </motion.article>
              );
            })}

          {/* ---------------- DELIVERABLES ---------------- */}
          {!loading &&
            view === "stream" &&
            tab === "deliverable" &&
            deliverables.map((entry) => {
              const people = contributorsOf(entry);
              const due = dueMeta(entry);
              const files = attachmentsOf(entry);
              return (
                <motion.article
                  className={`dl-deliverable${entry.submitted_at ? " is-done" : ""}${focused === entry.id ? " is-focused" : ""}`}
                  id={`entry-${entry.id}`}
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="dl-deliv-left">
                    <span className={`dl-due t-${due.tone}`}>{due.label}</span>
                    <span className="dl-mention-kind">{entry.deliverable_type || "Deliverable"}</span>
                  </div>
                  <div className="dl-deliv-main">
                    <h3>
                      <button type="button" className="dl-open-title" onClick={() => openReader(entry)}>
                        {entry.title}
                      </button>
                    </h3>
                    {entry.text && <p className="dl-post-excerpt">{excerpt(entry.text, 180)}</p>}
                    <AttachmentList items={files} />
                    <LinkChips
                      source={entry.linked_to ? byId.get(String(entry.linked_to)) : null}
                      spawned={childrenOf.get(String(entry.id))}
                      onOpen={goToEntry}
                    />
                    <div className="dl-deliv-foot">
                      <PeopleStack people={people} />
                      <Byline people={people} />
                      {files.length > 0 && <span className="dl-notecount">{files.length} files</span>}
                      {commentCounts[String(entry.id)] ? (
                        <span className="dl-notecount">{commentCounts[String(entry.id)]} notes</span>
                      ) : null}
                      <button className="dl-readmore" onClick={() => openReader(entry)}>
                        Open <span>↗</span>
                      </button>
                      {ownsEntry(entry) && (
                        <button
                          type="button"
                          className={entry.submitted_at ? "dl-submit is-done" : "dl-submit"}
                          onClick={() => toggleSubmitted(entry)}
                        >
                          {entry.submitted_at ? "✓ Submitted" : "Mark submitted"}
                        </button>
                      )}
                      <DeleteButton entry={entry} />
                    </div>
                  </div>
                </motion.article>
              );
            })}

          {/* ---------------- PROGRESS ---------------- */}
          {!loading &&
            view === "stream" &&
            tab === "progress" &&
            grouped.map((group) => (
              <div className="dl-daygroup" key={group.label}>
                <div className="dl-day">
                  {group.label}
                  <span className="line" />
                  {group.items.length} {group.items.length === 1 ? "entry" : "entries"}
                </div>
                <AnimatePresence mode="popLayout">
                  {group.items.map((entry, index) => {
                    const people = contributorsOf(entry);
                    return (
                      <motion.article
                        className={`dl-entry${focused === entry.id ? " is-focused" : ""}`}
                        id={`entry-${entry.id}`}
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.2) }}
                      >
                        <div className="dl-rail">
                          <span className="dl-node" />
                          <span className="dl-index">#{String(index + 1).padStart(2, "0")}</span>
                        </div>
                        <div className="dl-card">
                          <div className="dl-card-top">
                            <PeopleStack people={people} />
                            <Byline people={people} />
                            <span className="dl-tag">{entry.category}</span>
                            <span className="dl-time">{formatTime(entry.created_at)}</span>
                            <StagePill entry={entry} />
                            <DeleteButton entry={entry} />
                          </div>
                          {entry.title && (
                            <h3 className="dl-card-title">
                              <button type="button" className="dl-open-title" onClick={() => openReader(entry)}>
                                {entry.title}
                              </button>
                            </h3>
                          )}
                          <Markdown text={entry.text} renderRef={renderRef} />
                          <AttachmentList items={attachmentsOf(entry)} />
                          <LinkChips
                            source={entry.linked_to ? byId.get(String(entry.linked_to)) : null}
                            spawned={childrenOf.get(String(entry.id))}
                            onOpen={goToEntry}
                          />
                          <div className="dl-card-foot">
                            <button className="dl-readmore" onClick={() => openReader(entry)}>
                              Open entry <span>↗</span>
                            </button>
                            {commentCounts[String(entry.id)] ? (
                              <span className="dl-notecount">{commentCounts[String(entry.id)]} notes</span>
                            ) : null}
                          </div>
                          {people.length > 1 && (
                            <div className="dl-with">
                              <span>Contributors</span>
                              {people.map((person) => (
                                <b key={person}>{person}</b>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}
              {!loading && remaining > 0 && (
                <div className="dl-loadmore">
                  <button type="button" className="dl-btn" onClick={() => setShown((current) => current + PAGE_SIZE)}>
                    Load {Math.min(remaining, PAGE_SIZE)} more
                  </button>
                  <span>
                    {remaining} older {remaining === 1 ? "entry" : "entries"} hidden
                  </span>
                  {matching.length > PAGE_SIZE * 2 && (
                    <button type="button" className="dl-btn dl-btn-ghost" onClick={() => setShown(matching.length)}>
                      Show all {matching.length}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        <aside className="dl-side">
          <div className="dl-panel">
            <h3>Streams</h3>
            <div className="dl-split">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  className={tab === item.key ? "dl-stream is-on" : "dl-stream"}
                  onClick={() => setTab(item.key)}
                >
                  <b>{item.label}</b>
                  <span>{counts[item.key]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dl-panel">
            <h3>Discipline split</h3>
            <div className="dl-split">
              {categoryBreakdown.map((entry) => (
                <div className="dl-split-row" key={entry.option}>
                  <span>
                    {entry.option} <b>{entry.count}</b>
                  </span>
                  <span className="dl-track">
                    <i style={{ width: `${Math.max(entry.pct, 6)}%` }} />
                  </span>
                </div>
              ))}
              {categoryBreakdown.length === 0 && <span className="dl-count">No entries yet</span>}
            </div>
          </div>

          <div className="dl-panel">
            <h3>Contributors</h3>
            <div className="dl-people">
              {contributors.map((person) => (
                <div className="dl-person" key={person.name}>
                  <span className={`badge ${toneFor(person.name)}`}>{initials(person.name)}</span>
                  <span className="nm">{person.name}</span>
                  <span className="ct">{person.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dl-panel">
            <h3>Posting access</h3>
            <p className="dl-panel-copy">
              {userEmail
                ? "You are signed in. Post ideation, research, or progress — attach PDFs, CAD, PCB files, decks, or links."
                : "The log is public to read. Sign in with a crew account to publish entries."}
            </p>
            {userEmail ? (
              <button className="dl-btn dl-btn-primary" onClick={openComposer}>
                + New entry
              </button>
            ) : (
              <a className="dl-btn dl-btn-primary" href="/login">
                Sign in to post
              </a>
            )}
          </div>
        </aside>
      </div>

      <footer className="dl-shell dl-footer">
        <a className="dl-brand" href="/">
          <span className="dl-brand-mark">MTE</span>
          <span>MTE Capstone</span>
        </a>
        <span>Robotics design study · 2026</span>
        <span>Public design log · team posting</span>
      </footer>

      {/* ---------------- FULLSCREEN READER ---------------- */}
      <AnimatePresence>
        {readerEntry && (
          <motion.div
            className="dl-reader"
            role="dialog"
            aria-modal="true"
            aria-label={readerEntry.title || "Design log entry"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="dl-reader-bar">
              <div className="dl-reader-bar-left">
                <button className="dl-btn dl-btn-ghost" onClick={() => setReaderId(null)}>
                  ← Back to log
                </button>
                <span className="dl-reader-kind">{readerEntry.kind}</span>
              </div>
              <div className="dl-reader-bar-right">
                {ownsEntry(readerEntry) ? (
                  <>
                    <span className="dl-reader-owner">You wrote this</span>
                    <button className="dl-btn dl-btn-primary" onClick={() => startEdit(readerEntry)}>
                      Edit entry
                    </button>
                    <DeleteButton entry={readerEntry} />
                  </>
                ) : (
                  <span className="dl-reader-locked">
                    <i />
                    Locked — only {contributorsOf(readerEntry)[0]} can edit. Add a note below.
                  </span>
                )}
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  className={messageIsError ? "dl-banner is-error" : "dl-banner"}
                  role="alert"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <span className="dl-banner-icon">{messageIsError ? "!" : "✓"}</span>
                  <span className="dl-banner-text">{message}</span>
                  <button type="button" aria-label="Dismiss" onClick={() => setMessage("")}>
                    ×
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="dl-reader-scroll">
              <article className={`dl-reader-doc kind-${readerEntry.kind}`}>
                <span className="dl-kicker">
                  {readerEntry.kind === "meeting"
                    ? `Meeting · ${formatDate(readerEntry.meeting_date || readerEntry.created_at)}`
                    : usesDiscipline(readerEntry.kind)
                      ? `${readerEntry.category} · ${formatDate(readerEntry.created_at)}`
                      : `${readerEntry.kind} · ${formatDate(readerEntry.created_at)}`}
                </span>
                <h1>{readerEntry.title || excerpt(readerEntry.text, 70)}</h1>

                <div className="dl-reader-meta">
                  <PeopleStack people={contributorsOf(readerEntry)} />
                  <Byline people={contributorsOf(readerEntry)} />
                  {usesDiscipline(readerEntry.kind) && <span className="dl-tag">{readerEntry.category}</span>}
                  {readerEntry.kind === "progress" && <StagePill entry={readerEntry} />}
                  {readerEntry.resource_type && <span className="dl-tag">{readerEntry.resource_type}</span>}
                </div>

                {(readerEntry.resource_authors || readerEntry.resource_source || readerEntry.resource_year) && (
                  <div className="dl-res-meta">
                    {readerEntry.resource_authors && <span>{readerEntry.resource_authors}</span>}
                    {readerEntry.resource_source && <span>{readerEntry.resource_source}</span>}
                    {readerEntry.resource_year && <span>{readerEntry.resource_year}</span>}
                  </div>
                )}

                <Markdown text={readerEntry.text} renderRef={renderRef} />

                {readerEntry.kind === "meeting" && (readerEntry.action_items || []).length > 0 && (
                  <div className="dl-actions">
                    <div className="dl-actions-head">
                      <span>Action items</span>
                      <i />
                      <span>
                        {(readerEntry.action_items || []).filter((item) => item.done).length}/
                        {(readerEntry.action_items || []).length} done
                      </span>
                    </div>
                    {(readerEntry.action_items || []).map((item, index) => (
                      <button
                        type="button"
                        className={item.done ? "dl-action is-done" : "dl-action"}
                        key={`${readerEntry.id}-reader-${index}`}
                        onClick={() => toggleActionItem(readerEntry.id, index)}
                      >
                        <span className="dl-check">{item.done ? "✓" : ""}</span>
                        <span className="dl-action-text">{item.text}</span>
                        {item.owner && (
                          <span className={`dl-face ${toneFor(item.owner)}`} title={item.owner}>
                            {initials(item.owner)}
                          </span>
                        )}
                        {item.due && <span className="dl-action-due">{formatDate(item.due)}</span>}
                      </button>
                    ))}
                  </div>
                )}

                <AttachmentList items={attachmentsOf(readerEntry)} />
                <LinkChips
                  source={readerEntry.linked_to ? byId.get(String(readerEntry.linked_to)) : null}
                  spawned={childrenOf.get(String(readerEntry.id))}
                  onOpen={(id) => {
                    const next = byId.get(String(id));
                    if (next) openReader(next);
                  }}
                />

                {/* ---------- comments / added info ---------- */}
                <section className="dl-thread">
                  <div className="dl-thread-head">
                    <span className="dl-kicker">Notes & added info</span>
                    <span className="dl-count">
                      {comments.length} {comments.length === 1 ? "note" : "notes"}
                    </span>
                  </div>

                  {comments.length === 0 && (
                    <p className="dl-thread-empty">
                      No notes yet. Anyone on the team can add context, corrections, or files here without changing the
                      author&apos;s text.
                    </p>
                  )}

                  {comments.map((comment) => (
                    <article className="dl-comment" key={comment.id}>
                      <span className={`dl-face ${toneFor(prettyName(comment.author_name))}`}>
                        {initials(prettyName(comment.author_name))}
                      </span>
                      <div className="dl-comment-main">
                        <div className="dl-comment-top">
                          <b>{prettyName(comment.author_name)}</b>
                          <span>{formatDate(comment.created_at)}</span>
                          {ownsComment(comment) && (
                            <button className="dl-delete" onClick={() => deleteComment(comment)}>
                              Delete
                            </button>
                          )}
                        </div>
                        {comment.text && <Markdown text={comment.text} renderRef={renderRef} />}
                        <AttachmentList items={Array.isArray(comment.attachments) ? comment.attachments : []} />
                      </div>
                    </article>
                  ))}

                  {userEmail ? (
                    <form className="dl-comment-form" onSubmit={postComment}>
                      <textarea
                        value={commentDraft}
                        onKeyDown={mentionKeyDown}
                        onBlur={() => setTimeout(() => setMention(null), 150)}
                        onChange={(event) => {
                          setCommentDraft(event.target.value);
                          detectMention(event.target.value, event.target.selectionStart ?? 0, "comment");
                        }}
                        placeholder="Add context, a correction, a measurement, or a file — type @ to link another entry"
                      />
                      {mention && mention.target === "comment" && mentionOptions.length > 0 && (
                        <div className="dl-mentions is-inline">
                          <div className="dl-mentions-head">
                            <span>Top {mentionOptions.length} match{mentionOptions.length === 1 ? "" : "es"}</span>
                            <span>
                              Tab to cycle · {mentionIndex + 1}/{mentionOptions.length}
                            </span>
                          </div>
                          {mentionOptions.map((option, index) => (
                            <button
                              type="button"
                              key={`c-${option.type}-${option.id}`}
                              className={index === mentionIndex ? "dl-mention is-on" : "dl-mention"}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyMention(option);
                              }}
                              onMouseEnter={() => setMentionIndex(index)}
                            >
                              <span className={`dl-mention-kind k-${option.kind}`}>{option.kind}</span>
                              <span className="dl-mention-label">{option.label}</span>
                              <span className="dl-mention-meta">{option.meta}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="dl-comment-tools">
                        <label className="dl-comment-file">
                          Attach files
                          <input
                            type="file"
                            multiple
                            accept={UPLOAD_ACCEPT}
                            onChange={(event) => setCommentFiles(Array.from(event.target.files || []))}
                          />
                        </label>
                        <input name="commentLinks" type="text" placeholder="Links (comma separated)" />
                        <button className="dl-btn dl-btn-primary" type="submit" disabled={commentBusy}>
                          {commentBusy ? "Posting..." : "Add note"}
                        </button>
                      </div>
                      {commentFiles.length > 0 && (
                        <div className="dl-file-row">
                          {commentFiles.map((file) => (
                            <span className="dl-file" key={file.name}>
                              <span className={`dl-file-badge f-${familyOf(file.name)}`}>
                                {FAMILY_ICONS[familyOf(file.name)]}
                              </span>
                              <span className="dl-file-name">{file.name}</span>
                              <span className="dl-file-size">{formatSize(file.size)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </form>
                  ) : (
                    <a className="dl-btn dl-btn-primary" href="/login">
                      Sign in to add a note
                    </a>
                  )}
                </section>
              </article>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {composer && (
          <motion.div
            className="dl-editor"
            role="dialog"
            aria-modal="true"
            aria-label="New design log entry"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <form className="dl-editor-form" key={editingId ?? "new"} onSubmit={publish}>
              <div className="dl-editor-bar">
                <div className="dl-editor-title">
                  <span className="dl-kicker">{editingId !== null ? "Editing your entry" : "New entry"}</span>
                  <div className="dl-kindpick">
                    {tabs.map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        className={draftKind === item.key ? "is-on" : ""}
                        disabled={editingId !== null}
                        onClick={() => {
                          if (item.key === "meeting" && !draft.trim()) setDraft(MEETING_TEMPLATE);
                          if (item.key !== "meeting" && draft === MEETING_TEMPLATE) setDraft("");
                          setDraftKind(item.key);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="dl-editor-bar-actions">
                  <div className="dl-toggle">
                    <button type="button" className={preview ? "" : "is-on"} onClick={() => setPreview(false)}>
                      Write
                    </button>
                    <button type="button" className={preview ? "is-on" : ""} onClick={() => setPreview(true)}>
                      Preview
                    </button>
                  </div>
                  <button
                    type="button"
                    className="dl-btn dl-btn-ghost"
                    onClick={() => {
                      setComposer(false);
                      setEditingId(null);
                    }}
                  >
                    {editingId !== null ? "Cancel" : "Discard"}
                  </button>
                  <button className="dl-btn dl-btn-primary" type="submit" disabled={posting}>
                    {posting ? "Saving..." : editingId !== null ? "Save changes" : "Publish"}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {message && (
                  <motion.div
                    className={messageIsError ? "dl-banner is-error" : "dl-banner"}
                    role="alert"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <span className="dl-banner-icon">{messageIsError ? "!" : "✓"}</span>
                    <span className="dl-banner-text">{message}</span>
                    <button type="button" aria-label="Dismiss" onClick={() => setMessage("")}>
                      ×
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {linkedTo && (
                <div className="dl-linked-banner">
                  <span className="k">Linked to</span>
                  <b>{linkedTo.title || excerpt(linkedTo.text, 50)}</b>
                  <span className="d">{formatDate(linkedTo.meeting_date || linkedTo.created_at)}</span>
                  <button type="button" onClick={() => setLinkedTo(null)}>
                    Unlink ×
                  </button>
                </div>
              )}

              <div className="dl-editor-body">
                <div className="dl-editor-main">
                  <input
                    className="dl-title-input"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder={
                      draftKind === "ideation"
                        ? "Post title — what is the idea?"
                        : draftKind === "research"
                          ? "Resource title, patent number, or paper name"
                          : draftKind === "meeting"
                            ? "Weekly sync — week 5 (optional, auto-named from the date)"
                            : draftKind === "deliverable"
                              ? "Deliverable name — e.g. Project proposal"
                              : "Short headline for this update (optional)"
                    }
                  />
                  <div className="dl-md-hint">
                    <span>Markdown</span>
                    <code>**bold**</code>
                    <code>*italic*</code>
                    <code>## heading</code>
                    <code>- list</code>
                    <code>`code`</code>
                    <code>[link](url)</code>
                    <code>&gt; quote</code>
                    <code>| table |</code>
                    <code>![img](url)</code>
                    <code className="dl-hint-at">@ link an entry · Tab cycles</code>
                  </div>
                  {preview ? (
                    <div className={`dl-preview kind-${draftKind}`}>
                      {draftTitle.trim() && <h2 className="dl-preview-title">{draftTitle}</h2>}
                      {draft.trim() ? (
                        <Markdown text={draft} renderRef={renderRef} />
                      ) : (
                        <p className="dl-preview-empty">Nothing to preview yet.</p>
                      )}
                      {draftKind === "meeting" && actions.some((item) => item.text.trim()) && (
                        <div className="dl-actions">
                          <div className="dl-actions-head">
                            <span>Action items</span>
                            <i />
                            <span>{actions.filter((item) => item.text.trim()).length} queued</span>
                          </div>
                          {actions
                            .filter((item) => item.text.trim())
                            .map((item, index) => (
                              <span className="dl-action" key={index}>
                                <span className="dl-check" />
                                <span className="dl-action-text">{item.text}</span>
                                <span className={`dl-face ${toneFor(item.owner || authorName)}`}>
                                  {initials(item.owner || authorName)}
                                </span>
                                {item.due && <span className="dl-action-due">{formatDate(item.due)}</span>}
                              </span>
                            ))}
                        </div>
                      )}
                      {files.length > 0 && (
                        <div className="dl-file-row dl-preview-files">
                          {files.map((file) => (
                            <span className="dl-file" key={file.name}>
                              <span className={`dl-file-badge f-${familyOf(file.name)}`}>
                                {FAMILY_ICONS[familyOf(file.name)]}
                              </span>
                              <span className="dl-file-name">{file.name}</span>
                              <span className="dl-file-size">{formatSize(file.size)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      className="dl-editor-text"
                      value={draft}
                      onKeyDown={mentionKeyDown}
                      onBlur={() => setTimeout(() => setMention(null), 150)}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        detectMention(event.target.value, event.target.selectionStart ?? 0, "body");
                      }}
                      placeholder={
                        draftKind === "ideation"
                          ? "## The premise\n\nWhat if...\n\n- Why it could work\n- What would have to be true"
                          : draftKind === "research"
                            ? "Why this matters to us, what to steal, what to avoid."
                            : draftKind === "meeting"
                              ? MEETING_TEMPLATE
                              : "## What we tried\n\nToday we...\n\n- Result\n- Next step"
                      }
                      autoFocus
                    />
                  )}

                  {mention && mention.target === "body" && mentionOptions.length > 0 && (
                    <motion.div
                      className="dl-mentions"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div className="dl-mentions-head">
                        <span>Top {mentionOptions.length} match{mentionOptions.length === 1 ? "" : "es"}</span>
                        <span>
                          Tab to cycle · Enter to insert · {mentionIndex + 1}/{mentionOptions.length}
                        </span>
                      </div>
                      {mentionOptions.map((option, index) => (
                        <button
                          type="button"
                          key={`${option.type}-${option.id}`}
                          className={index === mentionIndex ? "dl-mention is-on" : "dl-mention"}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            applyMention(option);
                          }}
                          onMouseEnter={() => setMentionIndex(index)}
                        >
                          <span className={`dl-mention-kind k-${option.kind}`}>{option.kind}</span>
                          <span className="dl-mention-label">{option.label}</span>
                          <span className="dl-mention-meta">{option.meta}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                <aside className="dl-editor-side">
                  {draftKind === "meeting" && (
                    <>
                      <label className="dl-field">
                        <span className="lbl">Meeting date</span>
                        <input
                          name="meetingDate"
                          type="date"
                          defaultValue={editingEntry?.meeting_date || new Date().toISOString().slice(0, 10)}
                        />
                      </label>
                      <div className="dl-field">
                        <span className="lbl">
                          Action items <em>(owner + due date)</em>
                        </span>
                        <div className="dl-action-editor">
                          {actions.map((item, index) => (
                            <div className="dl-action-row" key={index}>
                              <input
                                type="text"
                                value={item.text}
                                placeholder="What needs to happen"
                                onChange={(event) => updateAction(index, { text: event.target.value })}
                              />
                              <div className="dl-action-row-meta">
                                <select
                                  value={item.owner}
                                  onChange={(event) => updateAction(index, { owner: event.target.value })}
                                >
                                  <option value="">{authorName} (me)</option>
                                  {taggableMembers.map((member) => (
                                    <option key={member} value={member}>
                                      {member}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="date"
                                  value={item.due || ""}
                                  onChange={(event) => updateAction(index, { due: event.target.value })}
                                />
                                <button type="button" onClick={() => removeActionRow(index)} aria-label="Remove">
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                          <button type="button" className="dl-add-action" onClick={addActionRow}>
                            + Add action item
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {draftKind === "progress" && (
                    <label className="dl-field">
                      <span className="lbl">Stage</span>
                      <select name="stage" defaultValue={editingEntry?.stage || "In progress"}>
                        {stages.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {draftKind === "deliverable" && (
                    <>
                      <label className="dl-field">
                        <span className="lbl">Deliverable type</span>
                        <select name="deliverableType" defaultValue={editingEntry?.deliverable_type || "Proposal"}>
                          {deliverableTypes.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="dl-field">
                        <span className="lbl">Due date</span>
                        <input name="dueDate" type="date" defaultValue={editingEntry?.due_date || ""} />
                      </label>
                    </>
                  )}

                  {draftKind === "research" && (
                    <>
                      <label className="dl-field">
                        <span className="lbl">Resource type</span>
                        <select name="resourceType" defaultValue={editingEntry?.resource_type || "Paper"}>
                          {resourceTypes.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="dl-field">
                        <span className="lbl">Authors / assignee</span>
                        <input
                          name="resourceAuthors"
                          type="text"
                          defaultValue={editingEntry?.resource_authors || ""}
                          placeholder="Okafor, Zhang, Beaulieu"
                        />
                      </label>
                      <label className="dl-field">
                        <span className="lbl">Source / venue</span>
                        <input
                          name="resourceSource"
                          type="text"
                          defaultValue={editingEntry?.resource_source || ""}
                          placeholder="IEEE, USPTO, journal..."
                        />
                      </label>
                      <label className="dl-field">
                        <span className="lbl">Year</span>
                        <input
                          name="resourceYear"
                          type="number"
                          min={1900}
                          max={2100}
                          defaultValue={editingEntry?.resource_year ?? ""}
                          placeholder="2023"
                        />
                      </label>
                    </>
                  )}

                  <div className="dl-field">
                    <span className="lbl">
                      Attachments <em>(pdf, docx, xlsx, pptx, stl/step, kicad, images — 25 MB each)</em>
                    </span>
                    <input
                      name="files"
                      type="file"
                      multiple
                      accept={UPLOAD_ACCEPT}
                      onChange={(event) => setFiles(Array.from(event.target.files || []))}
                    />
                    {files.length > 0 && (
                      <div className="dl-file-row">
                        {files.map((file) => (
                          <span className="dl-file" key={file.name}>
                            <span className={`dl-file-badge f-${familyOf(file.name)}`}>
                              {FAMILY_ICONS[familyOf(file.name)]}
                            </span>
                            <span className="dl-file-name">{file.name}</span>
                            <span className="dl-file-size">{formatSize(file.size)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="dl-field">
                    <span className="lbl">
                      Links <em>(one per line)</em>
                    </span>
                    <textarea name="links" rows={2} placeholder="https://patents.google.com/..." />
                  </label>

                  <div className="dl-field">
                    <span className="lbl">{draftKind === "meeting" ? "Attendees" : "Worked with"}</span>
                    <div className="dl-pickers">
                      {taggableMembers.map((member) => (
                        <button
                          type="button"
                          key={member}
                          className={taggedWith.includes(member) ? "dl-pick-btn is-on" : "dl-pick-btn"}
                          onClick={() => toggleTag(member)}
                        >
                          <span className={`dl-face ${toneFor(member)}`}>{initials(member)}</span>
                          {member}
                        </button>
                      ))}
                    </div>
                    <div className="dl-credit">
                      <PeopleStack people={draftContributors} />
                      <span>
                        <b>{authorName}</b>
                        {draftContributors.length > 1
                          ? ` +${draftContributors.length - 1} ${draftContributors.length === 2 ? "other" : "others"}`
                          : " only"}
                      </span>
                    </div>
                  </div>

                  {usesDiscipline(draftKind) && (
                    <label className="dl-field">
                      <span className="lbl">Discipline</span>
                      <select name="category" defaultValue={editingEntry?.category || "Mech"}>
                        {categories.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <p className="dl-editor-note">Entries are public. Esc closes this editor.</p>
                </aside>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {message && !composer && readerId === null && (
          <motion.div
            className={messageIsError ? "dl-toast is-error" : "dl-toast"}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            {message}
            <button aria-label="Dismiss" onClick={() => setMessage("")}>
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
