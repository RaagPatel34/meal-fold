import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Fold — Your personal food log",
  description: "Build custom restaurant meals and track calories, protein, carbs and fat.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
