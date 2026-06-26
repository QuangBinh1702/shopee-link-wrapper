import type { Metadata } from "next";
import { Nunito, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["vietnamese", "latin"],
  variable: "--font-nunito",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["vietnamese", "latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rút gọn link Shopee xinh hơn",
  description:
    "Dán link sản phẩm, nhận link gọn đẹp để chia sẻ ngay. Công cụ rút gọn link Shopee cho Creator, KOL, KOC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${nunito.variable} ${plusJakarta.variable}`}
    >
      <body className="font-body antialiased text-gray-800">
        {children}
      </body>
    </html>
  );
}
