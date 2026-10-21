import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const outfitFont = localFont({
  src: "../assets/fonts/Outfit-VariableFont.ttf",
  fallback: ["sans-serif", "system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "Cartwise",
  description: "Cartwise — shop smarter for the latest electronics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfitFont.className}>{children}</body>
    </html>
  );
}
