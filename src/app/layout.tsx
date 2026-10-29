import type { Metadata } from "next";
import "./globals.css";
import "./chat.css";
import "./extras.css";
export const metadata: Metadata = { title: "Our Little Universe", description: "A little universe made with love." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
