type MarkProps = {
  className?: string;
  /** "color" = yellow body (primary), "outline" = simplified mark, "reverse" = for dark surfaces */
  variant?: "color" | "outline" | "reverse";
  title?: string;
};

/** The Notify Robots dome mark, drawn as SVG so it stays crisp at every size. */
export function BrandMark({ className = "nr-mark", variant = "color", title }: MarkProps) {
  const stroke = variant === "reverse" ? "var(--nr-cream, #f2eadb)" : "var(--nr-ink, #181817)";
  const body = variant === "color" ? "var(--nr-yellow, #fdc209)" : "none";
  return (
    <svg className={className} viewBox="0 0 120 88" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path
        d="M16 80c-6 0-9-4-9-11C7 32 31 7 60 7s53 25 53 62c0 7-3 11-9 11H16Z"
        fill={body}
        stroke={stroke}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      {variant === "color" && <rect x="45" y="15" width="30" height="57" rx="12" fill="var(--nr-cream, #f2eadb)" />}
      <ellipse cx="24" cy="63" rx="7" ry="8" fill={stroke} />
      <ellipse cx="96" cy="63" rx="7" ry="8" fill={stroke} />
    </svg>
  );
}

/** Horizontal lockup: mark + lowercase Quicksand wordmark. */
export function BrandLockup({
  href = "/",
  variant = "color",
  className = "nr-lockup",
}: {
  href?: string;
  variant?: MarkProps["variant"];
  className?: string;
}) {
  return (
    <a className={className} href={href} aria-label="Notify Robots home">
      <BrandMark variant={variant} />
      <span className="nr-wordmark">notify robots</span>
    </a>
  );
}
