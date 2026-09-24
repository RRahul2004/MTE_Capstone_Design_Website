import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../lib/markdown";

const html = (src: string, renderRef?: (id: string, label: string) => JSX.Element) =>
  renderToStaticMarkup(<Markdown text={src} renderRef={renderRef} />).replace(/^<div class="dl-md">|<\/div>$/g, "");

test("inline emphasis", async (t) => {
  await t.test("bold", () => assert.equal(html("a **b** c"), "<p>a <strong>b</strong> c</p>"));
  await t.test("bold at line start", () => assert.equal(html("**b** c"), "<p><strong>b</strong> c</p>"));
  await t.test("multi-word bold", () => assert.equal(html("**a b c**"), "<p><strong>a b c</strong></p>"));
  await t.test("intra-word bold", () => assert.equal(html("mid**dle**"), "<p>mid<strong>dle</strong></p>"));
  await t.test("italic", () => assert.equal(html("a *b* c"), "<p>a <em>b</em> c</p>"));
  await t.test("bold italic", () =>
    assert.equal(html("***x***"), "<p><strong><em>x</em></strong></p>"));
  await t.test("italic nested in bold", () =>
    assert.equal(html("**a *b* c**"), "<p><strong>a <em>b</em> c</strong></p>"));
  await t.test("underscores inside identifiers are literal", () =>
    assert.equal(html("author_email and kicad_pcb"), "<p>author_email and kicad_pcb</p>"));
  await t.test("standalone underscore emphasis still works", () =>
    assert.equal(html("a _b_ c"), "<p>a <em>b</em> c</p>"));
  await t.test("unclosed marker is literal", () =>
    assert.equal(html("**oops"), "<p>**oops</p>"));
});

test("code", async (t) => {
  await t.test("inline", () => assert.equal(html("run `npm i`"), "<p>run <code>npm i</code></p>"));
  await t.test("markers inside code are literal", () =>
    assert.equal(html("`a **b**`"), "<p><code>a **b**</code></p>"));
  await t.test("fenced block", () =>
    assert.equal(html("```\nx = 1\n```"), "<pre><code>x = 1</code></pre>"));
  await t.test("unclosed fence still renders", () =>
    assert.equal(html("```\nx = 1"), "<pre><code>x = 1</code></pre>"));
});

test("blocks", async (t) => {
  await t.test("headings map h1-h4 to h3-h6", () =>
    assert.equal(html("# a\n## b\n### c\n#### d"), "<h3>a</h3><h4>b</h4><h5>c</h5><h6>d</h6>"));
  await t.test("bullet list", () => assert.equal(html("- a\n- b"), "<ul><li>a</li><li>b</li></ul>"));
  await t.test("star bullets", () => assert.equal(html("* a\n* b"), "<ul><li>a</li><li>b</li></ul>"));
  await t.test("ordered list", () => assert.equal(html("1. a\n2. b"), "<ol><li>a</li><li>b</li></ol>"));
  await t.test("paren ordered list", () => assert.equal(html("1) a\n2) b"), "<ol><li>a</li><li>b</li></ol>"));
  await t.test("blockquote", () => assert.equal(html("> a"), "<blockquote>a</blockquote>"));
  await t.test("horizontal rule", () => assert.equal(html("a\n\n---\n\nb"), "<p>a</p><hr/><p>b</p>"));
  await t.test("paragraph split", () => assert.equal(html("a\n\nb"), "<p>a</p><p>b</p>"));
  await t.test("soft line break", () => assert.equal(html("a\nb"), "<p>a<br/>b</p>"));
  await t.test("CRLF input", () => assert.equal(html("a\r\n\r\n- b"), "<p>a</p><ul><li>b</li></ul>"));
  await t.test("empty input", () => assert.equal(html(""), ""));
  await t.test("list then paragraph", () =>
    assert.equal(html("- a\n\nb"), "<ul><li>a</li></ul><p>b</p>"));
  await t.test("emphasis inside list item", () =>
    assert.equal(html("- **a**"), "<ul><li><strong>a</strong></li></ul>"));
});

test("links", async (t) => {
  await t.test("markdown link", () =>
    assert.equal(
      html("[x](https://a.b)"),
      '<p><a href="https://a.b" target="_blank" rel="noreferrer">x</a></p>',
    ));
  await t.test("bare url", () =>
    assert.equal(
      html("see https://a.b/c now"),
      '<p>see <a href="https://a.b/c" target="_blank" rel="noreferrer">https://a.b/c</a> now</p>',
    ));
});

test("@ entry references", async (t) => {
  await t.test("renders a fallback chip with no resolver", () =>
    assert.equal(html("see [[ref:42|My Entry]]"), '<p>see <span class="dl-ref">My Entry</span></p>'));

  await t.test("uses the resolver when provided", () => {
    const out = html("see [[ref:42|My Entry]]", (id, label) => <b data-id={id}>{label}</b>);
    assert.equal(out, '<p>see <b data-id="42">My Entry</b></p>');
  });

  await t.test("id and label are split on the first pipe only", () => {
    const out = html("[[ref:7|A | B]]", (id, label) => <b data-id={id}>{label}</b>);
    assert.equal(out, '<p><b data-id="7">A | B</b></p>');
  });
});

test("no raw HTML is emitted from user input", async (t) => {
  await t.test("script tags are escaped", () => {
    const out = html("<script>alert(1)</script>");
    assert.ok(!out.includes("<script>"), "script tag must be escaped");
    assert.ok(out.includes("&lt;script&gt;"));
  });
  await t.test("img onerror is escaped", () => {
    const out = html('<img src=x onerror="alert(1)">');
    assert.ok(!out.includes("<img"), "img tag must be escaped");
  });
});
