import type { Metadata } from "next";
import "./globals.css";
import { themeBootstrapScript } from "../lib/theme";

export const metadata: Metadata = {
  title: "Notify Robots | Approachable robotics for everyday life",
  description: "Notify Robots designs expressive, functional robots that bridge technology and people. The public design log for our MTE Capstone project.",
  icons: { icon: "/brand/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
