import type { Metadata } from "next";
import "./globals.css";
import { themeBootstrapScript } from "../lib/theme";

export const metadata: Metadata = {
  title: "MTE Capstone | Robotics design study",
  description: "The public design log for the MTE Capstone robotics project.",
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