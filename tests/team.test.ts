import test from "node:test";
import assert from "node:assert/strict";
import { prettyName, resolveDisplayName, teamNames } from "../lib/team";

test("prettyName resolves handles to real names", async (t) => {
  await t.test("every roster email resolves", () => {
    const expected: [string, string][] = [
      ["r2ramkum@uwaterloo.ca", "Rahul Ramkumar"],
      ["ng2li@uwaterloo.ca", "Nathaniel Li"],
      ["ecpwoo@uwaterloo.ca", "Ethan Woo"],
      ["n37patel@uwaterloo.ca", "Neel Patel"],
      ["y494lu@uwaterloo.ca", "Yang Lu"],
    ];
    expected.forEach(([email, name]) => assert.equal(prettyName(email), name, `${email} -> ${name}`));
  });
  await t.test("bare handles resolve too", () => {
    const expected: [string, string][] = [
      ["r2ramkum", "Rahul Ramkumar"],
      ["ng2li", "Nathaniel Li"],
      ["ecpwoo", "Ethan Woo"],
      ["n37patel", "Neel Patel"],
      ["y494lu", "Yang Lu"],
    ];
    expected.forEach(([handle, name]) => assert.equal(prettyName(handle), name, `${handle} -> ${name}`));
  });
  await t.test("watiam-style handle", () => assert.equal(prettyName("r2ramkum"), "Rahul Ramkumar"));
  await t.test("initial + last name", () => assert.equal(prettyName("n3li"), "Nathaniel Li"));
  await t.test("digits in the middle", () => assert.equal(prettyName("y24lu"), "Yang Lu"));
  await t.test("already a real name passes through", () =>
    assert.equal(prettyName("Rahul Ramkumar"), "Rahul Ramkumar"));
  await t.test("unknown email is title-cased", () =>
    assert.equal(prettyName("jane.doe@example.com"), "Jane Doe"));
  await t.test("empty input", () => assert.equal(prettyName(""), ""));
  await t.test("null input", () => assert.equal(prettyName(null), ""));
});

test("resolveDisplayName prefers the stored full name", async (t) => {
  await t.test("uses user_metadata.full_name", () =>
    assert.equal(
      resolveDisplayName({ email: "x1abc@uwaterloo.ca", user_metadata: { full_name: "Ada Lovelace" } }),
      "Ada Lovelace",
    ));
  await t.test("falls back to the email", () =>
    assert.equal(resolveDisplayName({ email: "r2ramkum@uwaterloo.ca" }), "Rahul Ramkumar"));
  await t.test("handles a missing user", () => assert.equal(resolveDisplayName(null), "Crew member"));
});

test("roster is intact", () => {
  assert.equal(teamNames.length, 5);
  assert.ok(teamNames.includes("Rahul Ramkumar"));
});
