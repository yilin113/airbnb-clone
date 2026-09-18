"use client";

import {
  CldUploadWidget,
  type CloudinaryUploadWidgetResults,
} from "next-cloudinary";
import { useCallback } from "react";
import { TbPhotoPlus } from "react-icons/tb";
import Image from "next/image";
import toast from "react-hot-toast";

interface ImageUploadProps {
  onChange: (value: string) => void;
  value: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onChange, value }) => {
  const handleUpload = useCallback(
    (result: CloudinaryUploadWidgetResults) => {
      const info = result.info;

      if (info && typeof info !== "string") {
        onChange(info.secure_url);
      }
    },
    [onChange]
  );

  const handleError = useCallback((error: unknown) => {
    const message =
      typeof error === "string"
        ? error
        : typeof error === "object" && error !== null && "statusText" in error
          ? String(error.statusText)
          : "請確認圖片格式與檔案大小後重試";

    if (message.toLowerCase().includes("cloud_name is disabled")) {
      toast.error("Cloudinary 尚未啟用，請先完成帳戶電子郵件驗證");
      return;
    }

    toast.error(`照片上傳失敗：${message}`);
  }, []);

  return (
    <CldUploadWidget
      onSuccess={handleUpload}
      onError={handleError}
      uploadPreset="Airbnb-clone"
      options={{
        sources: ["local", "camera", "url"],
        multiple: false,
        maxFiles: 1,
        maxFileSize: 10_000_000,
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "avif"],
        styles: {
          palette: {
            window: "#F5F5F5",
            sourceBg: "#FFFFFF",
            windowBorder: "#90a0b3",
            tabIcon: "#69778A",
            inactiveTabIcon: "#69778A",
            menuIcons: "#69778A",
            link: "#F43F5E",
            action: "#8F5DA5",
            inProgress: "#0194c7",
            complete: "#53ad9d",
            error: "#c43737",
            textDark: "#90A0B3",
            textLight: "#FFFFFF",
          },
          frame: {
            background: "#67676700",
          },
        },
      }}
    >
      {({ open }) => {
        return (
          <button
            type="button"
            onClick={() => open?.()}
            className="
              relative
              cursor-pointer
              hover:opacity-70
              transition
              border-dashed
              border-2
              p-20
              border-neutral-300
              flex
              flex-col
              justify-center
              items-center
              gap-4
              text-neutral-600
            "
          >
            <TbPhotoPlus size={50} />
            <div className="font-semibold text-lg">選擇或拖曳房源照片</div>
            <div className="text-sm font-normal text-neutral-500">
              JPG、PNG、WebP 或 AVIF，單張最大 10 MB
            </div>
            {value && (
              <div className="absolute inset-0 w-full h-full">
                <Image
                  alt="Uploaded image"
                  fill
                  sizes="100%"
                  style={{ objectFit: "cover" }}
                  src={value}
                />
              </div>
            )}
          </button>
        );
      }}
    </CldUploadWidget>
  );
};

export default ImageUpload;
