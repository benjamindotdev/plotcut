import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlotCut",
  description: "Turn any chapter into a social-ready video summary",
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
