import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Distributor Control",
  description: "Multilingual beverage distributor inventory and business monitoring system"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
