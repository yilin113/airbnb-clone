import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ImageUpload from "@/app/components/Inputs/ImageUpload";

const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ toast, default: toast }));

const widget = vi.hoisted(() => ({
  open: undefined as undefined | (() => void),
  onSuccess: undefined as
    | undefined
    | ((results: { info?: unknown }, widget: unknown) => void),
  onError: undefined as undefined | ((error: unknown) => void),
}));

vi.mock("next-cloudinary", () => ({
  CldUploadWidget: ({
    children,
    onSuccess,
    onError,
  }: {
    children: (props: { open?: () => void }) => React.ReactNode;
    onSuccess?: (results: { info?: unknown }, widget: unknown) => void;
    onError?: (error: unknown) => void;
  }) => {
    widget.onSuccess = onSuccess;
    widget.onError = onError;
    return <>{children({ open: widget.open })}</>;
  },
}));

beforeEach(() => {
  widget.open = undefined;
  widget.onSuccess = undefined;
  widget.onError = undefined;
  toast.error.mockReset();
});

describe("ImageUpload", () => {
  it("opens the Cloudinary widget on click", async () => {
    const open = vi.fn();
    widget.open = open;
    render(<ImageUpload value={[]} onChange={vi.fn()} />);

    await userEvent.click(screen.getByText("選擇或拖曳房源照片"));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("is inert while the widget has not handed back an opener", async () => {
    render(<ImageUpload value={[]} onChange={vi.fn()} />);

    await userEvent.click(screen.getByText("選擇或拖曳房源照片"));

    expect(screen.getByText("選擇或拖曳房源照片")).toBeInTheDocument();
  });

  it("publishes the uploaded url", () => {
    const onChange = vi.fn();
    render(<ImageUpload value={[]} onChange={onChange} />);

    widget.onSuccess?.(
      { info: { secure_url: "https://res.cloudinary.com/x.png" } },
      {},
    );

    expect(onChange).toHaveBeenCalledWith(["https://res.cloudinary.com/x.png"]);
  });

  it("ignores a result that carries no upload info", () => {
    const onChange = vi.fn();
    render(<ImageUpload value={[]} onChange={onChange} />);

    widget.onSuccess?.({ info: undefined }, {});
    widget.onSuccess?.({ info: "just-a-public-id" }, {});

    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the Cloudinary error instead of failing silently", () => {
    render(<ImageUpload value={[]} onChange={vi.fn()} />);

    widget.onError?.({ statusText: "File format is not allowed" });

    expect(toast.error).toHaveBeenCalledWith(
      "照片上傳失敗：File format is not allowed",
    );
  });

  it("previews already uploaded images", () => {
    render(
      <ImageUpload
        value={[
          "https://res.cloudinary.com/loft.png",
          "https://res.cloudinary.com/kitchen.png",
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByAltText("房源照片 1")).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/loft.png",
    );
    expect(screen.getByAltText("房源照片 2")).toBeInTheDocument();
    expect(screen.getByText("封面")).toBeInTheDocument();
  });

  it("can choose a cover and remove an image", async () => {
    const onChange = vi.fn();
    const images = [
      "https://res.cloudinary.com/loft.png",
      "https://res.cloudinary.com/kitchen.png",
    ];
    render(<ImageUpload value={images} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "設為封面 2" }));
    expect(onChange).toHaveBeenCalledWith([images[1], images[0]]);

    await userEvent.click(screen.getByRole("button", { name: "移除照片 1" }));
    expect(onChange).toHaveBeenCalledWith([images[1]]);
  });
});
