"use client";

import {
  CldUploadWidget,
  type CloudinaryUploadWidgetResults,
} from "next-cloudinary";
import { useCallback, useEffect, useRef } from "react";
import { TbPhotoPlus } from "react-icons/tb";
import Image from "next/image";
import toast from "react-hot-toast";

interface ImageUploadProps {
  onChange: (value: string[]) => void;
  value: string[];
}

const MAX_IMAGES = 12;

const ImageUpload: React.FC<ImageUploadProps> = ({ onChange, value }) => {
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleUpload = useCallback(
    (result: CloudinaryUploadWidgetResults) => {
      const info = result.info;
      const currentImages = valueRef.current;

      if (
        !info ||
        typeof info === "string" ||
        currentImages.includes(info.secure_url)
      ) {
        return;
      }

      if (currentImages.length >= MAX_IMAGES) {
        toast.error(`最多可上傳 ${MAX_IMAGES} 張照片`);
        return;
      }

      const nextImages = [...currentImages, info.secure_url];
      valueRef.current = nextImages;
      onChange(nextImages);
    },
    [onChange]
  );

  const removeImage = useCallback(
    (image: string) => {
      const nextImages = valueRef.current.filter((item) => item !== image);
      valueRef.current = nextImages;
      onChange(nextImages);
    },
    [onChange],
  );

  const makeCover = useCallback(
    (image: string) => {
      const nextImages = [
        image,
        ...valueRef.current.filter((item) => item !== image),
      ];
      valueRef.current = nextImages;
      onChange(nextImages);
    },
    [onChange],
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
        multiple: true,
        maxFiles: Math.max(1, MAX_IMAGES - value.length),
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
      {({ open }) => (
        <div className="flex flex-col gap-4">
          {value.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {value.map((image, index) => (
                <div
                  key={image}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100"
                >
                  <Image
                    alt={`房源照片 ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                    src={image}
                  />
                  {index === 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">
                      封面
                    </span>
                  )}
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    {index !== 0 && (
                      <button
                        type="button"
                        aria-label={`設為封面 ${index + 1}`}
                        onClick={() => makeCover(image)}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow hover:bg-neutral-100"
                      >
                        設為封面
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`移除照片 ${index + 1}`}
                      onClick={() => removeImage(image)}
                      className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow hover:bg-neutral-100"
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {value.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => open?.()}
              className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-neutral-300 p-8 text-neutral-600 transition hover:opacity-70"
            >
              <TbPhotoPlus size={50} />
              <div className="text-lg font-semibold">
                {value.length ? "新增更多照片" : "選擇或拖曳房源照片"}
              </div>
              <div className="text-sm font-normal text-neutral-500">
                JPG、PNG、WebP 或 AVIF，單張最大 10 MB
              </div>
            </button>
          )}

          <div className="text-sm text-neutral-500">
            已上傳 {value.length}/{MAX_IMAGES} 張；第一張會作為封面。
          </div>
        </div>
      )}
    </CldUploadWidget>
  );
};

export default ImageUpload;
