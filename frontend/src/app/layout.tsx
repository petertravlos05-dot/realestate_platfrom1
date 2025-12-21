"use client";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RealEstatePro - Η πιο αξιόπιστη πλατφόρμα για ακίνητα",
  description: "Βρείτε ή Καταχωρήστε το Ακίνητό σας με Αξιοπιστία",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
