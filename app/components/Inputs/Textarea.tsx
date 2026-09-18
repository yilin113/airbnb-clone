"use client";

import {
  FieldErrors,
  FieldValues,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";

interface TextareaProps {
  id: string;
  label: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  valueLength?: number;
  maxLength?: number;
  validation?: RegisterOptions<FieldValues, string>;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
}

const Textarea: React.FC<TextareaProps> = ({
  id,
  label,
  disabled = false,
  required = false,
  rows = 6,
  valueLength = 0,
  maxLength,
  validation,
  register,
  errors,
}) => (
  <div className="w-full">
    <label htmlFor={id} className="mb-2 block text-sm font-medium text-neutral-700">
      {label}
    </label>
    <textarea
      id={id}
      rows={rows}
      disabled={disabled}
      {...register(id, {
        required: required ? "此欄位為必填" : false,
        ...validation,
      })}
      className={`w-full resize-y rounded-md border-2 bg-white p-4 font-light outline-none transition disabled:cursor-not-allowed disabled:opacity-70 ${
        errors[id]
          ? "border-rose-500 focus:border-rose-500"
          : "border-neutral-300 focus:border-neutral-500"
      }`}
    />
    <div className="mt-1 flex justify-between gap-4 text-sm">
      <span className="text-rose-600">
        {errors[id]?.message ? String(errors[id]?.message) : ""}
      </span>
      {maxLength && (
        <span className="ml-auto text-neutral-500">
          {valueLength}/{maxLength}
        </span>
      )}
    </div>
  </div>
);

export default Textarea;
