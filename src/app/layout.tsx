import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "日程調整くん",
  description: "かんたん日程調整アプリ。カレンダーから候補日を選んで、リンクを共有するだけ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl font-bold text-gray-900">
              📅 日程調整くん
            </h1>
          </div>
        </header>
        <main className="flex-1 px-4 py-6">
          <div className="max-w-2xl mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
