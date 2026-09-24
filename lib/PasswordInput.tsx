"use client";

import { useState } from "react";

type Props = {
  name: string;
  label: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
};

export function PasswordInput({ name, label, placeholder, minLength, required, autoComplete }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <label>
      {label}
      <span className="password-field">
        <input
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          title={visible ? "Hide" : "Show"}
        >
          {visible ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 3l18 18" />
              <path d="M10.6 5.3A9.6 9.6 0 0 1 12 5.2c5 0 9 4.3 9 6.8 0 1-.7 2.3-1.8 3.5M6.3 7.1C4 8.6 3 10.7 3 12c0 2.5 4 6.8 9 6.8 1.7 0 3.2-.5 4.5-1.2" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 12s3.6-6.8 9-6.8S21 12 21 12s-3.6 6.8-9 6.8S3 12 3 12Z" />
              <circle cx="12" cy="12" r="2.8" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}
