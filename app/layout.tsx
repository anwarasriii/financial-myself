import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const chillax = localFont({
  src: [
    { path: "./fonts/chillax/Chillax-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/chillax/Chillax-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/chillax/Chillax-Semibold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/chillax/Chillax-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-chillax",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Financial Myself",
  description: "Personal finance system: split accounts, sinking funds, and allocation suggestions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="cupcake"
      className={`${chillax.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-base-200 text-base-content">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
