import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cedine Tools - Nouvelle adresse",
  description: "Cedine Tools a déménagé vers une nouvelle adresse",
  icons: {
    icon: '/ced-ine-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
