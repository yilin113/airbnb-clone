import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FavoritesClient from "@/app/favorites/FavoritesClient";
import PropertiesClient from "@/app/properties/PropertiesClient";
import ReservationsClient from "@/app/reservations/ReservationsClient";
import TripsClient from "@/app/trips/TripsClient";
import { makeListing, makeReservation, makeUser } from "../helpers/factories";
import { routerMock } from "../helpers/mocks";

vi.mock("axios", () => ({
  default: { delete: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ toast, default: toast }));

const mockedAxios = vi.mocked(axios);

const reservation = { ...makeReservation(), listing: makeListing() };
const approvedReservation = {
  ...makeReservation({ status: "APPROVED" }),
  listing: makeListing(),
};

beforeEach(() => {
  mockedAxios.delete.mockReset();
  mockedAxios.patch.mockReset();
});

describe("FavoritesClient", () => {
  it("renders a card per favorite", () => {
    render(
      <FavoritesClient
        currentUser={makeUser()}
        listings={[makeListing(), makeListing({ id: "listing-2" })]}
      />,
    );

    expect(screen.getByText("收藏房源")).toBeInTheDocument();
    expect(screen.getAllByAltText("Listing")).toHaveLength(2);
  });
});

describe("PropertiesClient", () => {
  it("deletes a property", async () => {
    mockedAxios.delete.mockResolvedValue({ data: {} });
    render(
      <PropertiesClient currentUser={makeUser()} listings={[makeListing()]} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "刪除房源" }),
    );

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "/api/listings/listing-1",
      );
    });
    expect(toast.success).toHaveBeenCalledWith("房源已刪除");
    expect(routerMock.refresh).toHaveBeenCalled();
  });

  it("surfaces the server's message when the delete fails", async () => {
    mockedAxios.delete.mockRejectedValue({
      response: { data: { message: "Listing is booked" } },
    });
    render(
      <PropertiesClient currentUser={makeUser()} listings={[makeListing()]} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "刪除房源" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Listing is booked");
    });
  });

  it("falls back to a generic message", async () => {
    mockedAxios.delete.mockRejectedValue(new Error("network"));
    render(
      <PropertiesClient currentUser={makeUser()} listings={[makeListing()]} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "刪除房源" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("發生錯誤，請稍後再試");
    });
  });
});

describe("ReservationsClient", () => {
  it("cancels a guest reservation", async () => {
    mockedAxios.delete.mockResolvedValue({ data: {} });
    render(
      <ReservationsClient
        currentUser={makeUser()}
        reservations={[approvedReservation]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "取消房客預訂" }),
    );

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "/api/reservations/reservation-1",
      );
    });
    expect(toast.success).toHaveBeenCalledWith("預訂已取消");
  });

  it("reports a failed cancellation", async () => {
    mockedAxios.delete.mockRejectedValue(new Error("network"));
    render(
      <ReservationsClient
        currentUser={makeUser()}
        reservations={[approvedReservation]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "取消房客預訂" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("發生錯誤，請稍後再試");
    });
  });

  it("approves a pending booking request", async () => {
    mockedAxios.patch.mockResolvedValue({ data: {} });
    render(
      <ReservationsClient
        currentUser={makeUser()}
        reservations={[reservation]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "核准申請" }),
    );

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/api/reservations/reservation-1",
        { decision: "APPROVED" },
      );
    });
    expect(toast.success).toHaveBeenCalledWith("已核准入住申請");
  });

  it("declines a pending booking request", async () => {
    mockedAxios.patch.mockResolvedValue({ data: {} });
    render(
      <ReservationsClient
        currentUser={makeUser()}
        reservations={[reservation]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "拒絕申請" }),
    );

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/api/reservations/reservation-1",
        { decision: "DECLINED" },
      );
    });
    expect(toast.success).toHaveBeenCalledWith("已拒絕入住申請");
  });

  it("reports a failed booking decision", async () => {
    mockedAxios.patch.mockRejectedValue(new Error("network"));
    render(
      <ReservationsClient
        currentUser={makeUser()}
        reservations={[reservation]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "核准申請" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("發生錯誤，請稍後再試");
    });
  });
});

describe("TripsClient", () => {
  it("cancels a trip", async () => {
    mockedAxios.delete.mockResolvedValue({ data: {} });
    render(
      <TripsClient currentUser={makeUser()} reservations={[reservation]} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "取消入住申請" }),
    );

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        "/api/reservations/reservation-1",
      );
    });
    expect(toast.success).toHaveBeenCalledWith(
      "入住申請已取消",
    );
  });

  it("surfaces the server's message when the cancel fails", async () => {
    mockedAxios.delete.mockRejectedValue({
      response: { data: { message: "Too late to cancel" } },
    });
    render(
      <TripsClient currentUser={makeUser()} reservations={[reservation]} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "取消入住申請" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Too late to cancel");
    });
  });

  it("falls back to a generic message", async () => {
    mockedAxios.delete.mockRejectedValue(new Error("network"));
    render(
      <TripsClient currentUser={makeUser()} reservations={[reservation]} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "取消入住申請" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("發生錯誤，請稍後再試");
    });
  });
});
