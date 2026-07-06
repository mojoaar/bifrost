import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bifröst",
  description: "A self-hosted blogging framework",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
