import test from "node:test";
import assert from "node:assert/strict";
import { embedUrlFor, parseDelimited, previewKindOf } from "../lib/attachments";

test("previewKindOf picks an in-app viewer", () => {
  assert.equal(previewKindOf({ name: "report.pdf", url: "https://x/report.pdf", family: "doc" }), "pdf");
  assert.equal(previewKindOf({ name: "photo.JPG", url: "https://x/photo.JPG", family: "image" }), "image");
  assert.equal(previewKindOf({ name: "deck.pptx", url: "https://x/deck.pptx", family: "slides" }), "office");
  assert.equal(previewKindOf({ name: "data.csv", url: "https://x/data.csv", family: "sheet" }), "table");
  assert.equal(previewKindOf({ name: "notes.md", url: "https://x/notes.md", family: "doc" }), "markdown");
  assert.equal(previewKindOf({ name: "part.step", url: "https://x/part.step", family: "cad" }), "model");
  assert.equal(previewKindOf({ name: "board.kicad_pcb", url: "https://x/board.kicad_pcb", family: "pcb" }), "model");
  assert.equal(previewKindOf({ name: "board.brd", url: "https://x/board.brd", family: "pcb" }), "none");
  assert.equal(previewKindOf({ name: "site", url: "https://example.com", family: "link" }), "none");
});

test("embedUrlFor converts known hosts", () => {
  assert.equal(
    embedUrlFor("https://docs.google.com/document/d/abc123/edit?usp=sharing"),
    "https://docs.google.com/document/d/abc123/preview",
  );
  assert.equal(embedUrlFor("https://drive.google.com/file/d/xyz/view"), "https://drive.google.com/file/d/xyz/preview");
  assert.equal(embedUrlFor("https://youtu.be/vid42"), "https://www.youtube.com/embed/vid42");
  assert.equal(embedUrlFor("https://example.com/page"), null);
});

test("parseDelimited handles quoted cells", () => {
  assert.deepEqual(parseDelimited('a,b\n"1,2","say ""hi"""\n'), [["a", "b"], ["1,2", 'say "hi"']]);
});

test("uniqueAttachments drops a link stored twice", async () => {
  const { uniqueAttachments } = await import("../lib/attachments");
  const link = { name: "example.com", url: "https://example.com/", family: "link" as const };
  assert.equal(uniqueAttachments([link, { ...link, url: "https://example.com" }]).length, 1);
});

test("uniqueAttachments drops the same file uploaded twice", async () => {
  const { uniqueAttachments } = await import("../lib/attachments");
  const a = { name: "paper.pdf", url: "https://s/design-files/u/1-paper.pdf", family: "doc" as const, size: 707647 };
  const b = { ...a, url: "https://s/design-files/u/2-paper.pdf" };
  assert.equal(uniqueAttachments([a, b]).length, 1);
  assert.equal(uniqueAttachments([a, { ...b, size: 1 }]).length, 2);
});
