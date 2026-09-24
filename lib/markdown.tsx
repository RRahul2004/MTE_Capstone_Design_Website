import { Fragment, ReactNode } from "react";

/* Minimal, dependency-free markdown renderer.
   Supports: headings, bold, italic, inline code, links, fenced code blocks,
   bullet + numbered lists, blockquotes, horizontal rules, paragraphs. */

export type RefRenderer = (id: string, label: string) => ReactNode;

function renderInline(text: string, keyPrefix: string, renderRef?: RefRenderer): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\[\[ref:[^\]]+\]\]|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[\s\S]+?\*\*|__[\s\S]+?__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  const isWordChar = (value: string | undefined) => Boolean(value && /[A-Za-z0-9]/.test(value));

  while ((match = pattern.exec(text))) {
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;

    // Underscore emphasis must not fire inside words (snake_case_name).
    if (token.startsWith("_")) {
      const before = text[match.index - 1];
      const after = text[match.index + token.length];
      if (isWordChar(before) || isWordChar(after)) {
        continue; // leave it as literal text
      }
    }

    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    if (token.startsWith("[[ref:")) {
      const raw = token.slice(6, -2);
      const split = raw.indexOf("|");
      const id = (split === -1 ? raw : raw.slice(0, split)).trim();
      const label = (split === -1 ? raw : raw.slice(split + 1)).trim();
      nodes.push(
        renderRef ? (
          <Fragment key={key}>{renderRef(id, label)}</Fragment>
        ) : (
          <span className="dl-ref" key={key}>
            {label}
          </span>
        ),
      );
    } else if (token.startsWith("***") || token.startsWith("___")) {
      nodes.push(
        <strong key={key}>
          <em>{renderInline(token.slice(3, -3), `${key}-bi`, renderRef)}</em>
        </strong>,
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      // Recurse so *italic* and `code` nest correctly inside bold.
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), `${key}-b`, renderRef)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](");
      const label = token.slice(1, split);
      const href = token.slice(split + 2, -1);
      nodes.push(
        <a key={key} href={href} target="_blank" rel="noreferrer">
          {label}
        </a>,
      );
    } else if (token.startsWith("http")) {
      nodes.push(
        <a key={key} href={token} target="_blank" rel="noreferrer">
          {token}
        </a>,
      );
    } else {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), `${key}-i`, renderRef)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({
  text,
  className = "dl-md",
  renderRef,
}: {
  text: string;
  className?: string;
  renderRef?: RefRenderer;
}) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let code: { lang: string; lines: string[] } | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const content = paragraph.join("\n");
    blocks.push(
      <p key={`p-${key++}`}>
        {content.split("\n").map((line, index) => (
          <Fragment key={index}>
            {index > 0 && <br />}
            {renderInline(line, `p${key}-${index}`, renderRef)}
          </Fragment>
        ))}
      </p>,
    );
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, index) => <li key={index}>{renderInline(item, `li${key}-${index}`, renderRef)}</li>);
    blocks.push(list.ordered ? <ol key={`l-${key++}`}>{items}</ol> : <ul key={`l-${key++}`}>{items}</ul>);
    list = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    blocks.push(<blockquote key={`q-${key++}`}>{renderInline(quote.join(" "), `q${key}`, renderRef)}</blockquote>);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\s+$/, "");

    if (code) {
      if (/^```/.test(line)) {
        blocks.push(
          <pre key={`c-${key++}`}>
            <code>{code.lines.join("\n")}</code>
          </pre>,
        );
        code = null;
      } else {
        code.lines.push(rawLine);
      }
      return;
    }
    if (/^```/.test(line)) {
      flushAll();
      code = { lang: line.slice(3).trim(), lines: [] };
      return;
    }
    if (!line.trim()) {
      flushAll();
      return;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${key}`, renderRef);
      const Tag = (["h3", "h4", "h5", "h6"] as const)[level - 1];
      blocks.push(<Tag key={`h-${key++}`}>{content}</Tag>);
      return;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushAll();
      blocks.push(<hr key={`hr-${key++}`} />);
      return;
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      flushQuote();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push((bullet ? bullet[1] : ordered![1]).trim());
      return;
    }
    const blockquote = /^\s*>\s?(.*)$/.exec(line);
    if (blockquote) {
      flushParagraph();
      flushList();
      quote.push(blockquote[1]);
      return;
    }
    flushList();
    flushQuote();
    paragraph.push(line);
  });

  if (code) {
    blocks.push(
      <pre key={`c-${key++}`}>
        <code>{(code as { lines: string[] }).lines.join("\n")}</code>
      </pre>,
    );
  }
  flushAll();

  return <div className={className}>{blocks}</div>;
}
