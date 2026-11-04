const paths: Record<string, JSX.Element> = {
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.2-4 4.2-6 8-6s6.8 2 8 6" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  square: <rect x="4" y="4" width="16" height="16" rx="4" />,
  rocket: <><path d="M14 4c3-1 5-1 6 0 1 1 1 3 0 6l-7 7-6-6 7-7Z" /><path d="M7 11 4 12l-1 4 4-1M13 17l-1 3-4 1 1-4" /><circle cx="15.5" cy="8.5" r="1.4" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Z" /><path d="M10 21h4" /></>,
  robot: <><rect x="4" y="7" width="16" height="12" rx="4" /><path d="M12 3v4" /><circle cx="9" cy="13" r="1" /><circle cx="15" cy="13" r="1" /></>,
  pin: <><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  play: <path d="M7 4v16l13-8L7 4Z" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  arrow: <path d="M7 17 17 7M8 7h9v9" />,
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg className="nr-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
