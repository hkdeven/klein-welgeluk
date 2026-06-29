import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import AppFrame from "@/components/AppFrame";

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
      <body>
        <ToastProvider>
          <AuthProvider>
            <AppFrame>{children}</AppFrame>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
