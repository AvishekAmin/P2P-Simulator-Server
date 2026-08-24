import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCM Platform — E2 + PR2",
  description:
    "Unified Supply Chain Management platform for Procurement (PR2) and Logistics (E2)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
