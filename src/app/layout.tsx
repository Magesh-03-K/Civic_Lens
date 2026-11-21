import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicLens - Transparent Civic Grievance & Infrastructure Triage",
  description: "AI-powered civic grievance triage and resolution tracking for Indian cities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
