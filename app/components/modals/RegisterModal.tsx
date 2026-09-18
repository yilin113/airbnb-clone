"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";

import useRegisterModal from "../../hooks/useRegisterModal";
import Modal from "./Modal";
import Heading from "../Heading";
import Input from "../Inputs/Input";
import toast from "react-hot-toast";
import useLoginModal from "@/app/hooks/useLoginModal";

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);

    axios
      .post("/api/register", data)
      .then(() => {
        toast.success("帳號建立成功");
        registerModal.onClose();
        loginModal.onOpen();
      })
      .catch((error: unknown) => {
        if (axios.isAxiosError(error)) {
          const code = error.response?.data?.error?.code;
          const issue = error.response?.data?.error?.issues?.[0]?.message;

          if (code === "EMAIL_ALREADY_EXISTS") {
            toast.error("這個電子郵件已經註冊過");
            return;
          }

          if (code === "VALIDATION_ERROR" && issue) {
            toast.error(issue);
            return;
          }
        }

        toast.error("無法建立帳號，請稍後再試");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const toggle = useCallback(() => {
    registerModal.onClose();
    loginModal.onOpen();
  }, [loginModal, registerModal]);

  const bodyContent = (
    <div className="flex flex-col gap-4">
      <Heading title="歡迎使用日本中期旅居" subtitle="建立你的帳號" />
      <Input
        id="email"
        label="電子郵件"
        type="email"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        validation={{
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "請輸入有效的電子郵件",
          },
        }}
      />
      <Input
        id="name"
        label="姓名"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        validation={{
          minLength: { value: 2, message: "姓名至少需要 2 個字元" },
          maxLength: { value: 80, message: "姓名最多 80 個字元" },
        }}
      />
      <Input
        id="password"
        label="密碼"
        type="password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
        validation={{
          minLength: { value: 8, message: "密碼至少需要 8 個字元" },
          maxLength: { value: 72, message: "密碼最多 72 個字元" },
        }}
      />
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-4 mt-3">
      <hr />
      <div className="text-center text-sm text-neutral-500">
        Google 與 GitHub 登入將於後續開放
      </div>
      <div
        className="
        text-neutral-500
        text-center
        mt-4
        font-light
        "
      >
        <div className="flex flex-row items-center justify-center gap-2">
          <div>已經有帳號？</div>
          <div
            onClick={toggle}
            className="
            text-neutral-800
            cursor-pointer
            hover:underline
            "
          >
            登入
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <Modal
      disabled={isLoading}
      isOpen={registerModal.isOpen}
      title="註冊"
      actionLabel="建立帳號"
      onClose={registerModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
};

export default RegisterModal;
