import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { InviteListener } from "@/components/InviteListener";
import { OmokSocketProvider } from "@/components/OmokSocketProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "오목 | omok-game",
  description: "로컬·AI·온라인 오목 웹 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <OmokSocketProvider>
            <InviteListener />
            {children}
          </OmokSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
