import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Outreach.ai",
  description: "Agentic AI to automate your job hunt",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

