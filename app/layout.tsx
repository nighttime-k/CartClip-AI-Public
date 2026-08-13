import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CartClip AI — Public Edition",
  description: "Turn product screenshots into evidence-aware short-form video prompts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
