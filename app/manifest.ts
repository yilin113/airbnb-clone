import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MACHI STAY｜日本中期旅居",
    short_name: "MACHI STAY",
    description:
      "提供台灣旅客赴日居住 30 天以上的中期租賃服務。日本で、暮らすように泊まる。",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F4EE",
    theme_color: "#D98B86",
    lang: "zh-Hant",
    icons: [
      {
        src: "/brand/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
