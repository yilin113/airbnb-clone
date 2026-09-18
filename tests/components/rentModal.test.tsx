import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RentModal from "@/app/components/modals/RentModal";
import useRentModal from "@/app/hooks/useRentModal";
import { routerMock } from "../helpers/mocks";

vi.mock("axios", () => ({
  default: { post: vi.fn(), isAxiosError: vi.fn(() => false) },
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ toast, default: toast }));

vi.mock("@/app/components/Map", () => ({
  default: () => <div data-testid="map" />,
}));

vi.mock("@/app/components/Inputs/ImageUpload", () => ({
  default: ({ onChange }: { onChange: (value: string[]) => void }) => (
    <button type="button" onClick={() => onChange(["https://cdn/loft.png"])}>
      upload
    </button>
  ),
}));

const mockedAxios = vi.mocked(axios);

beforeEach(() => {
  useRentModal.setState({ isOpen: true });
  mockedAxios.post.mockReset();
});

const next = () =>
  userEvent.click(screen.getByRole("button", { name: "下一步" }));

async function walkToPrice() {
  await userEvent.click(screen.getByText("Beach"));
  await next(); // -> location
  const location = screen.getByRole("combobox");
  await userEvent.click(location);
  await userEvent.type(location, "新宿");
  await userEvent.keyboard("{Enter}");
  await userEvent.type(
    document.querySelector("#postalCode") as HTMLElement,
    "160-0022",
  );
  await userEvent.type(
    document.querySelector("#addressLine") as HTMLElement,
    "東京都新宿區新宿一丁目",
  );
  await next(); // -> info
  await next(); // -> images
  await userEvent.click(screen.getByRole("button", { name: "upload" }));
  await next(); // -> description
  await userEvent.type(
    document.querySelector("#title") as HTMLElement,
    "Sunny loft",
  );
  await userEvent.type(
    document.querySelector("#description") as HTMLElement,
    "Very sunny and quiet apartment near the station with reliable Wi-Fi.",
  );
  await next(); // -> price
  const price = document.querySelector("#price") as HTMLElement;
  await userEvent.clear(price);
  await userEvent.type(price, "120");
}

describe("RentModal", () => {
  it("stays hidden while its store is closed", () => {
    useRentModal.setState({ isOpen: false });
    const { container } = render(<RentModal />);

    expect(container).toBeEmptyDOMElement();
  });

  it("starts on the category step with no way back", () => {
    render(<RentModal />);

    expect(
      screen.getByText("這間房源屬於哪一類？"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "返回" }),
    ).not.toBeInTheDocument();
  });

  it("walks forwards and backwards through every step", async () => {
    render(<RentModal />);

    await userEvent.click(screen.getByText("Beach"));
    await next();
    expect(screen.getByText("房源位於日本哪裡？")).toBeInTheDocument();

    const country = screen.getByRole("combobox");
    await userEvent.click(country);
    await userEvent.type(country, "新宿");
    await userEvent.keyboard("{Enter}");
    await userEvent.type(
      document.querySelector("#postalCode") as HTMLElement,
      "160-0022",
    );
    await userEvent.type(
      document.querySelector("#addressLine") as HTMLElement,
      "東京都新宿區新宿一丁目",
    );

    await next();
    expect(
      screen.getByText("提供房源基本資料"),
    ).toBeInTheDocument();

    await next();
    expect(
      screen.getByText("上傳房源照片"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "upload" }));
    await next();
    expect(
      screen.getByText("向房客介紹你的房源"),
    ).toBeInTheDocument();

    // Title and description are required, so the step will not advance until
    // they are filled in.
    await next();
    expect(
      screen.getByText("向房客介紹你的房源"),
    ).toBeInTheDocument();

    await userEvent.type(
      document.querySelector("#title") as HTMLElement,
      "Sunny loft",
    );
    await userEvent.type(
      document.querySelector("#description") as HTMLElement,
      "Very sunny and quiet apartment near the station with reliable Wi-Fi.",
    );

    await next();
    expect(
      screen.getByText("設定月租與其他費用"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刊登房源" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(
      screen.getByText("向房客介紹你的房源"),
    ).toBeInTheDocument();
    expect(document.querySelector("#title")).toHaveValue("Sunny loft");
    expect(document.querySelector("#description")).toHaveValue(
      "Very sunny and quiet apartment near the station with reliable Wi-Fi.",
    );
  });

  it("blocks incomplete steps with a useful message", async () => {
    render(<RentModal />);

    await next();
    expect(toast.error).toHaveBeenCalledWith("請先選擇房源類型");
    expect(screen.getByText("這間房源屬於哪一類？")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Beach"));
    await next();
    await next();
    expect(toast.error).toHaveBeenCalledWith("請先選擇最接近的城市與車站");
    expect(screen.getByText("房源位於日本哪裡？")).toBeInTheDocument();
  });

  it("edits the counters on the info step", async () => {
    render(<RentModal />);

    await userEvent.click(screen.getByText("Beach"));
    await next();
    const location = screen.getByRole("combobox");
    await userEvent.click(location);
    await userEvent.type(location, "新宿");
    await userEvent.keyboard("{Enter}");
    await userEvent.type(
      document.querySelector("#postalCode") as HTMLElement,
      "160-0022",
    );
    await userEvent.type(
      document.querySelector("#addressLine") as HTMLElement,
      "東京都新宿區新宿一丁目",
    );
    await next();

    // [guest -, guest +, room -, room +, bathroom -, bathroom +]
    const steppers = Array.from(
      document.querySelectorAll<HTMLElement>(".cursor-pointer"),
    );
    await userEvent.click(steppers[1]);
    await userEvent.click(steppers[3]);
    await userEvent.click(steppers[5]);

    expect(screen.getAllByText("2")).toHaveLength(3);
  });

  it("publishes the listing and resets", async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });
    render(<RentModal />);

    await walkToPrice();
    await userEvent.click(screen.getByRole("button", { name: "刊登房源" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/listings",
        expect.objectContaining({
          category: "Beach",
          imageSrc: "https://cdn/loft.png",
          imageSrcs: ["https://cdn/loft.png"],
          postalCode: "160-0022",
          addressLine: "東京都新宿區新宿一丁目",
          stationWalkMinutes: 5,
          title: "Sunny loft",
          description:
            "Very sunny and quiet apartment near the station with reliable Wi-Fi.",
          price: 120,
          utilitiesFee: 0,
          managementFee: 0,
          cleaningFee: 0,
          deposit: 0,
        }),
      );
    });
    expect(toast.success).toHaveBeenCalledWith("房源已建立");
    expect(routerMock.refresh).toHaveBeenCalled();
    expect(useRentModal.getState().isOpen).toBe(false);
  });

  it("reports a failed publish", async () => {
    mockedAxios.post.mockRejectedValue(new Error("nope"));
    render(<RentModal />);

    await walkToPrice();
    await userEvent.click(screen.getByRole("button", { name: "刊登房源" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("無法刊登房源，請稍後再試");
    });
    expect(useRentModal.getState().isOpen).toBe(true);
  });
});
