import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrussEngage — Invoice & Quotation Studio",
  description:
    "Modern, flexible invoicing and quotation software with custom branding, logo upload, post-creation editing, and vector PDF export.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
