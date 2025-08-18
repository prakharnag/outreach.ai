import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import Head from "next/head";
import { AuthProvider } from "../contexts/auth-context";

export const metadata: Metadata = {
  title: "Outreach",
  description: "AI-powered outreach platform for personalized cold emails and LinkedIn messages",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/assets/outreach.png" sizes="any" />
        <link rel="apple-touch-icon" href="/assets/outreach.png" />
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