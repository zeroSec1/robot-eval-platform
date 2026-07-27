import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robot Eval",
  description: "Open-source robot rollout monitoring and failure-eval platform.",
};

// Runs before paint so the stored/system theme applies with no flash.
const THEME_INIT = `(function(){try{
  var t = localStorage.getItem('theme');
  if (!t) t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="flex min-h-full bg-bg text-text">
        <Nav />
        <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
