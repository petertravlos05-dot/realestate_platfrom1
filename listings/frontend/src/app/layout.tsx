import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";
import Providers from "@/providers/Providers";
import { QueryProvider } from '@/providers/QueryProvider';
import { Toaster } from 'react-hot-toast';
import { NotificationProvider } from '@/contexts/NotificationContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RealEstatePro - Η πιο αξιόπιστη πλατφόρμα για ακίνητα",
  description: "Βρείτε ή Καταχωρήστε το Ακίνητό σας με Αξιοπιστία",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el">
      <body className={inter.className}>
        <NotificationProvider>
          <QueryProvider>
            <Providers>
              <ClientLayout>
                {children}
              </ClientLayout>
            </Providers>
          </QueryProvider>
          <Toaster />
        </NotificationProvider>
      </body>
    </html>
  );
} 