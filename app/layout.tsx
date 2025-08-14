import type { ReactNode } from "react";
import "./globals.css";
import Head from "next/head";
import { AuthProvider } from "../contexts/auth-context";

export const metadata = {
  title: "Outreach.ai",
  description: "Agentic AI to automate your job hunt",
  icons: {
    icon: [
      { url: "/assets/brandicon.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/brandicon.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/assets/brandicon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/assets/brandicon.png" sizes="any" />
        <link rel="apple-touch-icon" href="/assets/brandicon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}