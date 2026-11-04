import test from "node:test";
import assert from "node:assert/strict";
import { parseMeetingNotes } from "../lib/meetingNotes";

test("parses header, body, and action items", () => {
  const parsed = parseMeetingNotes(
    [
      "Title: Gantry review",
      "Date: 2026-10-20",
      "Attendees: Rahul, Neel, ng2li",
      "",
      "## Decisions",
      "- Use NEMA 17 motors",
      "",
      "## Action items",
      "- [ ] Order motors @Neel due 2026-10-25",
      "- [x] Share CAD — Nathaniel",
      "- Update BOM",
    ].join("\n"),
    { fallbackOwner: "Rahul Ramkumar" },
  );
  assert.equal(parsed.title, "Gantry review");
  assert.equal(parsed.meetingDate, "2026-10-20");
  assert.deepEqual(parsed.attendees, ["Rahul Ramkumar", "Neel Patel", "Nathaniel Li"]);
  assert.equal(parsed.text, "## Decisions\n- Use NEMA 17 motors");
  assert.deepEqual(parsed.actionItems, [
    { text: "Order motors", owner: "Neel Patel", due: "2026-10-25", done: false },
    { text: "Share CAD", owner: "Nathaniel Li", due: null, done: true },
    { text: "Update BOM", owner: "Rahul Ramkumar", due: null, done: false },
  ]);
});

test("falls back to the filename date and a generated title", () => {
  const parsed = parseMeetingNotes("Talked about sensors.", { fileName: "meeting-2026-09-22.txt" });
  assert.equal(parsed.meetingDate, "2026-09-22");
  assert.equal(parsed.title, "Weekly sync — Sep 22, 2026");
  assert.equal(parsed.text, "Talked about sensors.");
});

test("a leading markdown heading becomes the title", () => {
  const parsed = parseMeetingNotes("# Kickoff\n\nNotes here", { fallbackDate: "2026-09-01" });
  assert.equal(parsed.title, "Kickoff");
  assert.equal(parsed.text, "Notes here");
});
