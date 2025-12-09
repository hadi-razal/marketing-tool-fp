import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/providers/ToastProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Force dynamic rendering for all pages to ensure env vars are available
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Fairplatz Marketing Tool",
  description: "Advanced marketing management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
