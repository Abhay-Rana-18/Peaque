import type { Metadata } from "next";
import { Archivo, Inter, Caveat, Kalam } from "next/font/google";
import { PencilDefs } from "@/components/site/pencil-defs";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  display: "swap",
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Peaque — Motion & Web Studio for AI SaaS",
  description:
    "Peaque makes motion graphics, product explainer videos and modern websites that help AI SaaS products get noticed, understood and loved.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${caveat.variable} ${kalam.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preload"
          href="/Loading.gif"
          as="image"
          type="image/gif"
          fetchPriority="high"
        />
      </head>
      <body
        className="min-h-full flex flex-col overflow-x-clip"
        suppressHydrationWarning
      >
        <PencilDefs />
        {children}
      </body>
    </html>
  );
}
