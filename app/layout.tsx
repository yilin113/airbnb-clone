import { Toaster } from "react-hot-toast";
import ClientOnly from "./components/ClientOnly";
import Navbar from "./components/navbar/Navbar";
import "./globals.css";
import { Nunito } from "next/font/google";
import getCurrentUser from "./actions/getCurrentUser";
import LoginModal from "./components/modals/LoginModal";
import RegisterModal from "./components/modals/RegisterModal";
import RentModal from "./components/modals/RentModal";
import SearchModal from "./components/modals/SearchModal";
import type { Metadata } from "next";

const font = Nunito({ subsets: ["latin"] });

export const metadata: Metadata = {
  applicationName: "MACHI STAY",
  title: {
    default: "MACHI STAY｜日本中期旅居",
    template: "%s｜MACHI STAY",
  },
  description:
    "MACHI STAY 提供台灣旅客赴日居住 30 天以上的中期租賃服務。日本で、暮らすように泊まる。",
  keywords: [
    "MACHI STAY",
    "日本中期租屋",
    "日本旅居",
    "日本月租",
    "Japan rental",
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="zh-Hant">
      <body className={font.className}>
        <ClientOnly>
          <Toaster />
          <RentModal />
          <SearchModal />
          <RegisterModal />
          <LoginModal />
          <Navbar currentUser={currentUser} />
          <div className="pb-20 pt-28">{children}</div>
        </ClientOnly>
      </body>
    </html>
  );
}
