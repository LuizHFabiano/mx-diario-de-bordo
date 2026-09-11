import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MX Diário de Bordo API",
  description: "API do Diário de Bordo da MX Soluções",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
