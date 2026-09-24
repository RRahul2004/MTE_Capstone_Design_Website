export type TeamMember = { initials: string; name: string; expertise: string; tone: string; emails?: string[] };

export const teamRoster: TeamMember[] = [
  { initials: "NL", name: "Nathaniel Li", expertise: "", tone: "team-cyan", emails: ["ng2li@uwaterloo.ca"] },
  { initials: "YL", name: "Yang Lu", expertise: "", tone: "team-lilac", emails: ["y494lu@uwaterloo.ca"] },
  { initials: "RR", name: "Rahul Ramkumar", expertise: "", tone: "team-lime", emails: ["r2ramkum@uwaterloo.ca"] },
  { initials: "EW", name: "Ethan Woo", expertise: "", tone: "team-blue", emails: ["ecpwoo@uwaterloo.ca"] },
  { initials: "NP", name: "Neel Patel", expertise: "", tone: "team-slate", emails: ["n37patel@uwaterloo.ca"] },
];

export const teamNames = teamRoster.map((member) => member.name);

function titleCase(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** Matches an email, a bare username, or a school-style handle against the roster. */
function matchRoster(rawHandle: string) {
  const handle = rawHandle.toLowerCase().trim();
  if (!handle) return null;

  const local = handle.includes("@") ? handle.split("@")[0] : handle;

  // 1. Exact email, or the local part of a known email (ng2li === ng2li@uwaterloo.ca)
  const known = teamRoster.find((member) =>
    member.emails?.some((email) => {
      const stored = email.toLowerCase();
      return stored === handle || stored.split("@")[0] === local;
    }),
  );
  if (known) return known.name;

  // 2. The full name written out with separators (rahul.ramkumar)
  const spaced = local.replace(/[._-]+/g, " ");
  const byName = teamRoster.find((member) => member.name.toLowerCase() === spaced);
  if (byName) return byName.name;

  // 3. Heuristic for unregistered handles: initial(s) + last name, in either order.
  const letters = local.replace(/[^a-z]/g, "");
  if (!letters) return null;

  const byHandle = teamRoster.find((member) => {
    const parts = member.name.toLowerCase().split(/\s+/);
    const first = parts[0];
    const last = parts[parts.length - 1];

    // initial + last name, possibly truncated: r2ramkum, n3li, ng2li, ecpwoo
    if (letters.startsWith(first[0])) {
      const rest = letters.slice(1);
      if (rest === last) return true;
      if (last.length >= 2 && letters.endsWith(last)) return true;
      if (rest.length >= 3 && (last.startsWith(rest) || rest.startsWith(last))) return true;
    }
    // last name first, or the full first name
    if (letters.startsWith(last) || letters.startsWith(first)) return letters.length >= last.length;
    return false;
  });
  return byHandle ? byHandle.name : null;
}

/** Turns an email, username, or stored author string into a human display name. */
export function prettyName(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/\s/.test(trimmed) && !trimmed.includes("@")) return trimmed; // already a real name
  const matched = matchRoster(trimmed);
  if (matched) return matched;
  const local = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  return titleCase(local.replace(/\d+/g, " ")) || local;
}

/** Preferred display name for a signed-in Supabase user. */
export function resolveDisplayName(user?: {
  email?: string | null;
  user_metadata?: { full_name?: string | null; name?: string | null } | null;
} | null) {
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (metadataName && metadataName.trim()) return metadataName.trim();
  return prettyName(user?.email) || "Crew member";
}
