import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InventoryOps AI",
  description: "Auditable AI Workflow Engine for Operational Decisions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
