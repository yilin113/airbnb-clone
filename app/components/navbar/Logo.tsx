"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const Logo = () => {
  const router = useRouter();

  return (
    <button
      aria-label="返回 MACHI STAY 首頁"
      className="shrink-0 cursor-pointer"
      onClick={() => router.push("/")}
      type="button"
    >
      <Image
        alt="MACHI STAY"
        className="hidden h-[60px] w-[168px] object-contain md:block"
        height={400}
        width={1120}
        priority
        src="/brand/logo-horizontal.png"
      />
      <Image
        alt="MACHI STAY logo mark"
        className="h-11 w-11 object-contain md:hidden"
        height={800}
        width={800}
        priority
        src="/brand/logo-mark.png"
      />
    </button>
  );
};

export default Logo;
