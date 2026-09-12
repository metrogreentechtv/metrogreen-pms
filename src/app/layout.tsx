import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetroGreen Process & Management System",
  description:
    "Centralized quotation, proposal, and project management for MetroGreen Technologies Corporation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
