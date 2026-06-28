import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klein Welgeluk — Build Diary",
  description: "House construction project management and diary",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body>{children}</body>
    </html>
  );
}
