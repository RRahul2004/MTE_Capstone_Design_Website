import { Fragment, ReactNode } from "react";

/* Minimal, dependency-free markdown renderer.
   Blocks:  headings, paragraphs, fenced code, blockquotes, horizontal rules,
            nested ordered/unordered lists, pipe tables
   Inline:  bold, italic, bold-italic, code, links, bare URLs, images,
            and [[ref:id|label]] entry references */

export type RefRenderer = (id: string, label: string) => ReactNode;

type ListNode = { text: string; ordered: boolean; children: ListNode[] };

function renderInline(text: string, keyPrefix: string, renderRef?: RefRenderer): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(!\[[^\]]*\]\([^)\s]+\)|\[\[ref:[^\]]+\]\]|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[\s\S]+?\*\*|__[\s\S]+?__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s)]+)/g;
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
      if (isWordChar(before) || isWordChar(after)) continue;
    }

    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    if (token.startsWith("![")) {
      const split = token.indexOf("](");
      const alt = token.slice(2, split);
      const src = token.slice(split + 2, -1);
      nodes.push(
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="dl-md-img" key={key} src={src} alt={alt} loading="lazy" />,
      );
    } else if (token.startsWith("[[ref:")) {
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
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), `${key}-b`, renderRef)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](");
      nodes.push(
        <a key={key} href={token.slice(split + 2, -1)} target="_blank" rel="noreferrer">
          {renderInline(token.slice(1, split), `${key}-a`, renderRef)}
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

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
// a divider cell is --- or :--- or :---: or ---: (one dash is enough for :-:)
const TABLE_DIVIDER_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** Builds a nested tree from flat list lines using their indentation. */
function buildList(lines: { indent: number; ordered: boolean; text: string }[]) {
  const roots: ListNode[] = [];
  const stack: { indent: number; node: ListNode }[] = [];

  lines.forEach((line) => {
    const node: ListNode = { text: line.text, ordered: line.ordered, children: [] };
    while (stack.length && line.indent <= stack[stack.length - 1].indent) stack.pop();
    if (stack.length) stack[stack.length - 1].node.children.push(node);
    else roots.push(node);
    stack.push({ indent: line.indent, node });
  });
  return roots;
}

function renderList(nodes: ListNode[], keyPrefix: string, renderRef?: RefRenderer): ReactNode {
  if (!nodes.length) return null;
  const Tag = nodes[0].ordered ? "ol" : "ul";
  return (
    <Tag key={keyPrefix}>
      {nodes.map((node, index) => (
        <li key={index}>
          {renderInline(node.text, `${keyPrefix}-${index}`, renderRef)}
          {renderList(node.children, `${keyPrefix}-${index}-c`, renderRef)}
        </li>
      ))}
    </Tag>
  );
}

function splitRow(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
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
  let list: { indent: number; ordered: boolean; text: string }[] = [];
  let quote: string[] = [];
  let code: { lang: string; lines: string[] } | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const content = paragraph.join("\n");
    const id = key++;
    blocks.push(
      <p key={`p-${id}`}>
        {content.split("\n").map((line, index) => (
          <Fragment key={index}>
            {index > 0 && <br />}
            {renderInline(line, `p${id}-${index}`, renderRef)}
          </Fragment>
        ))}
      </p>,
    );
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(renderList(buildList(list), `l-${key++}`, renderRef));
    list = [];
  };
  const flushQuote = () => {
    if (!quote.length) return;
    const id = key++;
    blocks.push(<blockquote key={`q-${id}`}>{renderInline(quote.join(" "), `q${id}`, renderRef)}</blockquote>);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (let cursor = 0; cursor < lines.length; cursor += 1) {
    const rawLine = lines[cursor];
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
      continue;
    }
    if (/^```/.test(line)) {
      flushAll();
      code = { lang: line.slice(3).trim(), lines: [] };
      continue;
    }
    if (!line.trim()) {
      flushAll();
      continue;
    }

    // --- pipe table: a header row followed by a |---|---| divider ---
    const next = lines[cursor + 1];
    if (line.includes("|") && next && TABLE_DIVIDER_RE.test(next) && next.includes("-")) {
      flushAll();
      const header = splitRow(line);
      const aligns = splitRow(next).map((cell) =>
        cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : "left",
      );
      const rows: string[][] = [];
      let scan = cursor + 2;
      while (scan < lines.length && lines[scan].includes("|") && lines[scan].trim()) {
        rows.push(splitRow(lines[scan]));
        scan += 1;
      }
      const id = key++;
      blocks.push(
        <div className="dl-md-table" key={`t-${id}`}>
          <table>
            <thead>
              <tr>
                {header.map((cell, index) => (
                  <th key={index} style={{ textAlign: aligns[index] || "left" }}>
                    {renderInline(cell, `th${id}-${index}`, renderRef)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {header.map((_, cellIndex) => (
                    <td key={cellIndex} style={{ textAlign: aligns[cellIndex] || "left" }}>
                      {renderInline(row[cellIndex] ?? "", `td${id}-${rowIndex}-${cellIndex}`, renderRef)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      cursor = scan - 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const Tag = (["h3", "h4", "h5", "h6"] as const)[level - 1];
      blocks.push(<Tag key={`h-${key}`}>{renderInline(heading[2], `h${key++}`, renderRef)}</Tag>);
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushAll();
      blocks.push(<hr key={`hr-${key++}`} />);
      continue;
    }

    const item = LIST_RE.exec(line);
    if (item) {
      flushParagraph();
      flushQuote();
      list.push({
        indent: item[1].replace(/\t/g, "  ").length,
        ordered: /\d/.test(item[2]),
        text: item[3].trim(),
      });
      continue;
    }
    // continuation line inside the current list item
    if (list.length && /^\s{2,}\S/.test(rawLine)) {
      list[list.length - 1].text += ` ${line.trim()}`;
      continue;
    }

    const blockquote = /^\s*>\s?(.*)$/.exec(line);
    if (blockquote) {
      flushParagraph();
      flushList();
      quote.push(blockquote[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

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
