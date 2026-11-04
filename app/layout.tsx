import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Central – Sales Co-pilot (demo)",
  description: "Demo van de Conversal Sales Co-pilot in de meetingsectie van Central.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500&family=Manrope:wght@300;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
