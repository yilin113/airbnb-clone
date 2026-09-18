"use client";

import useRentModal from "@/app/hooks/useRentModal";
import Modal from "./Modal";
import { useMemo, useState } from "react";
import Heading from "../Heading";
import { categories } from "../navbar/Categories";
import CategoryInput from "../Inputs/CategoryInput";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import CountrySelect from "../Inputs/CountrySelect";
import dynamic from "next/dynamic";
import Counter from "../Inputs/Counter";
import ImageUpload from "../Inputs/ImageUpload";
import Input from "../Inputs/Input";
import Textarea from "../Inputs/Textarea";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

enum STEPS {
  CATEGORY = 0,
  LOCATION = 1,
  INFO = 2,
  IMAGES = 3,
  DESCRIPTION = 4,
  PRICE = 5,
}

const Map = dynamic(() => import("../Map"), { ssr: false });

const RentModal = () => {
  const rentModal = useRentModal();
  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizingDescription, setIsOptimizingDescription] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors },
    reset,
  } = useForm<FieldValues>({
    defaultValues: {
      category: "",
      location: null,
      guestCount: 1,
      roomCount: 1,
      bathroomCount: 1,
      imageSrc: "",
      imageSrcs: [],
      price: 1,
      utilitiesFee: 0,
      managementFee: 0,
      cleaningFee: 0,
      deposit: 0,
      title: "",
      description: "",
      postalCode: "",
      addressLine: "",
      stationWalkMinutes: 5,
    },
  });

  const category = watch("category");
  const location = watch("location");
  const guestCount = watch("guestCount");
  const roomCount = watch("roomCount");
  const bathroomCount = watch("bathroomCount");
  const imageSrcs = watch("imageSrcs") as string[];
  const title = watch("title");
  const description = watch("description");
  const stationWalkMinutes = watch("stationWalkMinutes");

  const setCustomValue = (id: string, value: unknown) => {
    setValue(id, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const onBack = () => {
    setStep((prev) => prev - 1);
  };

  const onNext = async () => {
    if (step === STEPS.CATEGORY && !category) {
      toast.error("請先選擇房源類型");
      return;
    }

    if (step === STEPS.LOCATION && !location) {
      toast.error("請先選擇最接近的城市與車站");
      return;
    }

    if (
      step === STEPS.LOCATION &&
      !(await trigger(["postalCode", "addressLine", "stationWalkMinutes"]))
    ) {
      toast.error("請補齊有效的日本地址資料");
      return;
    }

    if (step === STEPS.IMAGES && !imageSrcs.length) {
      toast.error("請至少上傳一張房源照片");
      return;
    }

    if (step === STEPS.DESCRIPTION && !(await trigger(["title", "description"]))) {
      toast.error("請補齊房源名稱與至少 30 個字的介紹");
      return;
    }

    setStep((prev) => prev + 1);
  };

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (step !== STEPS.PRICE) {
      return onNext();
    }

    setIsLoading(true);

    axios
      .post("/api/listings", data)
      .then(() => {
        toast.success("房源已建立");
        router.refresh();
        reset();
        setStep(STEPS.CATEGORY);
        rentModal.onClose();
      })
      .catch((error: unknown) => {
        if (axios.isAxiosError(error)) {
          const code = error.response?.data?.error?.code;
          const issuePath = error.response?.data?.error?.issues?.[0]?.path;

          if (code === "UNAUTHORIZED") {
            toast.error("登入已逾時，請重新登入後再刊登");
            return;
          }

          if (code === "VALIDATION_ERROR") {
            const labels: Record<string, string> = {
              title: "房源名稱",
              description: "房源介紹",
              imageSrc: "房源照片",
              category: "房源類型",
              location: "房源地點",
              postalCode: "郵遞區號",
              addressLine: "完整地址",
              stationWalkMinutes: "車站步行時間",
              price: "每月租金",
            };
            toast.error(`${labels[issuePath] ?? "刊登資料"}尚未正確填寫`);
            return;
          }
        }

        toast.error("無法刊登房源，請稍後再試");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const onOptimizeDescription = async () => {
    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      typeof description !== "string" ||
      description.trim().length < 10
    ) {
      toast.error("請先填寫房源名稱與至少 10 個字的基本資料");
      return;
    }

    setIsOptimizingDescription(true);

    try {
      const response = await axios.post("/api/ai/listing-description", {
        title,
        description,
        locationLabel: location
          ? `${location.label}，${location.region}`
          : undefined,
        stationWalkMinutes,
        roomCount,
        bathroomCount,
        guestCount,
      });

      setCustomValue("description", response.data.description);
      toast.success("AI 草稿已產生，請確認內容是否符合實際房況");
    } catch (error: unknown) {
      if (
        axios.isAxiosError(error) &&
        error.response?.data?.error?.code === "AI_UNAVAILABLE"
      ) {
        toast.error("AI 文案服務尚未設定，需先加入 OpenAI API key");
      } else {
        toast.error("目前無法產生 AI 草稿，請稍後再試");
      }
    } finally {
      setIsOptimizingDescription(false);
    }
  };

  const actionLabel = useMemo(() => {
    if (step === STEPS.PRICE) {
      return "刊登房源";
    }

    return "下一步";
  }, [step]);

  const secondaryActionLabel = useMemo(() => {
    if (step === STEPS.CATEGORY) {
      return undefined;
    }

    return "返回";
  }, [step]);

  let bodyContent = (
    <div className="flex flex-col gap-4">
      <Heading
        title="這間房源屬於哪一類？"
        subtitle="之後仍可修改"
      />
      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          lg:grid-cols-3
          gap-3
          max-h-[50vh]
          overflow-y-auto
        "
      >
        {categories.map((item) => (
          <div key={item.label} className="col-span-1">
            <CategoryInput
              onClick={(category) => setCustomValue("category", category)}
              selected={category === item.label}
              label={item.label}
              icon={item.icon}
            />
          </div>
        ))}
      </div>
    </div>
  );

  if (step === STEPS.LOCATION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="房源位於日本哪裡？"
          subtitle="先選擇最接近的城市與車站；完整地址只會提供給確認入住的房客"
        />
        <CountrySelect
          onChange={(value) => setCustomValue("location", value)}
          value={location}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            id="postalCode"
            label="日本郵遞區號（例：110-0005）"
            disabled={isLoading}
            register={register}
            errors={errors}
            required
            validation={{
              pattern: {
                value: /^\d{3}-?\d{4}$/,
                message: "請輸入 7 碼日本郵遞區號",
              },
            }}
          />
          <Input
            id="stationWalkMinutes"
            label="步行至車站（分鐘）"
            type="number"
            disabled={isLoading}
            register={register}
            errors={errors}
            required
            validation={{
              min: { value: 1, message: "步行時間至少 1 分鐘" },
              max: { value: 120, message: "步行時間最多 120 分鐘" },
            }}
          />
        </div>
        <Input
          id="addressLine"
          label="完整地址（不會公開顯示）"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
          validation={{
            minLength: { value: 5, message: "請輸入完整地址" },
            maxLength: { value: 200, message: "地址最多 200 個字元" },
          }}
        />
        <div className="rounded-lg bg-neutral-100 p-3 text-sm leading-6 text-neutral-600">
          公開頁面只顯示城市、行政區與最近車站；完整地址只供平台管理與確認入住後提供。
        </div>
        <Map key={location?.value} center={location?.latlng} />
      </div>
    );
  }

  if (step === STEPS.INFO) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="提供房源基本資料"
          subtitle="之後仍可修改"
        />
        <Counter
          title="房客"
          subtitle="最多可入住幾人？"
          value={guestCount}
          onChange={(value) => setCustomValue("guestCount", value)}
        />
        <hr />
        <Counter
          title="房間"
          subtitle="房客可使用幾間房？"
          value={roomCount}
          onChange={(value) => setCustomValue("roomCount", value)}
        />
        <hr />
        <Counter
          title="衛浴"
          subtitle="房客可使用幾間衛浴？"
          value={bathroomCount}
          onChange={(value) => setCustomValue("bathroomCount", value)}
        />
      </div>
    );
  }

  if (step === STEPS.IMAGES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="上傳房源照片"
          subtitle="最多 12 張；第一張是封面，可隨時調整或移除"
        />
        <ImageUpload
          value={imageSrcs}
          onChange={(images) => {
            setCustomValue("imageSrcs", images);
            setCustomValue("imageSrc", images[0] ?? "");
          }}
        />
      </div>
    );
  }

  if (step === STEPS.DESCRIPTION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="向房客介紹你的房源"
          subtitle="清楚說明空間、交通、設備與適合的旅居方式"
        />
        <Input
          id="title"
          label="房源名稱"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
          validation={{
            minLength: { value: 3, message: "房源名稱至少需要 3 個字元" },
            maxLength: { value: 120, message: "房源名稱最多 120 個字元" },
          }}
        />
        <hr />
        <Textarea
          id="description"
          label="房源介紹"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
          valueLength={typeof description === "string" ? description.length : 0}
          maxLength={2000}
          validation={{
            minLength: { value: 30, message: "請至少輸入 30 個字元，讓房客了解實際居住情況" },
            maxLength: { value: 2000, message: "房源介紹最多 2,000 個字元" },
          }}
        />
        <div className="rounded-lg bg-rose-50 p-4 text-sm leading-6 text-neutral-700">
          建議包含：步行到車站時間、網路與工作空間、廚房及洗衣設備、周邊採買、噪音與入住限制。
        </div>
        <button
          type="button"
          onClick={onOptimizeDescription}
          disabled={isOptimizingDescription}
          className="rounded-lg border border-rose-500 px-4 py-3 font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isOptimizingDescription ? "正在整理文案…" : "AI 優化成繁體中文介紹"}
        </button>
        <p className="text-xs leading-5 text-neutral-500">
          AI 只會整理你提供的資料；產生後請自行確認，不會自動刊登。
        </p>
      </div>
    );
  }

  if (step === STEPS.PRICE) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="設定月租與其他費用"
          subtitle="所有金額皆為日圓，之後仍可修改"
        />
        <Input
          id="price"
          label="每月租金（日圓）"
          formatPrice
          type="number"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
          validation={{ min: { value: 1, message: "每月租金必須大於 0" } }}
        />
        <Input
          id="utilitiesFee"
          label="每月水電費（日圓）"
          formatPrice
          type="number"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <Input
          id="managementFee"
          label="每月管理費（日圓）"
          formatPrice
          type="number"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <Input
          id="cleaningFee"
          label="一次性清潔費（日圓）"
          formatPrice
          type="number"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <Input
          id="deposit"
          label="可退還押金（日圓）"
          formatPrice
          type="number"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
      </div>
    );
  }

  return (
    <Modal
      isOpen={rentModal.isOpen}
      disabled={isLoading}
      onClose={rentModal.onClose}
      onSubmit={step === STEPS.PRICE ? handleSubmit(onSubmit) : onNext}
      actionLabel={actionLabel}
      secondaryActionLabel={secondaryActionLabel}
      secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
      title="刊登日本房源"
      body={<div key={step}>{bodyContent}</div>}
    />
  );
};

export default RentModal;
