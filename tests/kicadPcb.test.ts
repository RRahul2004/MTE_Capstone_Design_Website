import test from "node:test";
import assert from "node:assert/strict";
import { chainSegments, parseKicadPcb, parseSExpr } from "../lib/kicadPcb";

test("parses a compact KiCad PCB into preview geometry", () => {
  const source = `(kicad_pcb (general (thickness 1.6)) (gr_rect (start 0 0) (end 20 10) (stroke (width 0.05) (type default)) (fill none) (layer "Edge.Cuts")) (segment (start 1 2) (end 4 2) (width 0.25) (layer "F.Cu") (net 0)) (via (at 5 5) (size 1) (drill 0.5) (layers "F.Cu" "B.Cu")) (footprint "R" (layer "F.Cu") (at 5 5) (fp_rect (start -1 -0.5) (end 1 0.5) (stroke (width .1) (type default)) (fill none) (layer "F.CrtYd")) (pad "1" smd rect (at 0 0) (size 1 1) (layers "F.Cu" "F.Paste" "F.Mask"))))`;
  const model = parseKicadPcb(source);
  assert.equal(model.thickness, 1.6);
  assert.equal(model.outline.length, 4);
  assert.equal(model.tracks.length, 1);
  assert.equal(model.vias.length, 1);
  assert.equal(model.pads.length, 1);
  assert.equal(model.bodies.length, 1);
});

test("joins edge segments", () => {
  assert.equal(chainSegments([[{ x: 0, y: 0 }, { x: 1, y: 0 }], [{ x: 1, y: 0 }, { x: 1, y: 1 }], [{ x: 1, y: 1 }, { x: 0, y: 1 }], [{ x: 0, y: 1 }, { x: 0, y: 0 }]]).length, 1);
  assert.equal(Array.isArray(parseSExpr("(one (two three))")), true);
});
