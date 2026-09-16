import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ListingClient from "@/app/listings/[listingId]/ListingClient";
import useLoginModal from "@/app/hooks/useLoginModal";
import { makeListing, makeReservation, makeUser } from "../helpers/factories";
import { routerMock } from "../helpers/mocks";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ toast, default: toast }));

vi.mock("@/app/components/Map", () => ({
  default: () => <div data-testid="map" />,
}));

const dateRange = vi.hoisted(() => ({
  onChange: undefined as undefined | ((value: { selection: unknown }) => void),
}));

vi.mock("react-date-range", () => ({
  DateRange: ({
    onChange,
    disabledDates,
  }: {
    onChange: (value: { selection: unknown }) => void;
    disabledDates: Date[];
  }) => {
    dateRange.onChange = onChange;
    return (
      <div
        data-testid="date-range"
        data-disabled-count={disabledDates.length}
      />
    );
  },
}));

const mockedAxios = vi.mocked(axios);

const listing = { ...makeListing(), user: makeUser() };

beforeEach(() => {
  useLoginModal.setState({ isOpen: false });
  mockedAxios.post.mockReset();
  dateRange.onChange = undefined;
});

describe("ListingClient", () => {
  it("renders the listing and its monthly price", () => {
    render(<ListingClient listing={listing} currentUser={makeUser()} />);

    expect(screen.getByText("Sunny loft")).toBeInTheDocument();
    expect(
      screen.getByText("This property is close to the beach!"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("¥ 120")).toHaveLength(2);
  });

  it("blocks out the dates of existing reservations", () => {
    render(
      <ListingClient
        listing={listing}
        currentUser={makeUser()}
        reservations={[
          makeReservation({
            startDate: new Date(2024, 4, 1),
            endDate: new Date(2024, 4, 3),
          }),
        ]}
      />,
    );

    expect(screen.getByTestId("date-range")).toHaveAttribute(
      "data-disabled-count",
      "2",
    );
  });

  it("recalculates the total when a range is picked", async () => {
    render(<ListingClient listing={listing} currentUser={makeUser()} />);

    act(() => {
      dateRange.onChange?.({
        selection: {
          startDate: new Date(2024, 4, 1),
          endDate: new Date(2024, 4, 5),
          key: "selection",
        },
      });
    });

    expect(await screen.findByText("¥ 17")).toBeInTheDocument();
  });

  it("keeps the monthly price and does not submit an open-ended range", async () => {
    render(<ListingClient listing={listing} currentUser={makeUser()} />);

    act(() => {
      dateRange.onChange?.({
        selection: { startDate: new Date(2024, 4, 1), key: "selection" },
      });
    });

    expect(screen.getAllByText("¥ 120")).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Reserve" }));
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("keeps the monthly price and does not submit an end-only range", async () => {
    render(<ListingClient listing={listing} currentUser={makeUser()} />);

    act(() => {
      dateRange.onChange?.({
        selection: { endDate: new Date(2024, 4, 5), key: "selection" },
      });
    });

    expect(screen.getAllByText("¥ 120")).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Reserve" }));
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("books the stay and sends the guest to their trips", async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });
    render(<ListingClient listing={listing} currentUser={makeUser()} />);

    await userEvent.click(screen.getByRole("button", { name: "Reserve" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/reservations",
        expect.not.objectContaining({ totalPrice: expect.anything() }),
      );
    });
    expect(toast.success).toHaveBeenCalledWith("Booking request sent");
    expect(routerMock.push).toHaveBeenCalledWith("/trips");
  });

  it("asks an anonymous visitor to log in first", async () => {
    render(<ListingClient listing={listing} />);

    await userEvent.click(screen.getByRole("button", { name: "Reserve" }));

    expect(useLoginModal.getState().isOpen).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("copes with a listing whose category is unknown", () => {
    render(
      <ListingClient
        listing={{ ...listing, category: "Spaceship" }}
        currentUser={makeUser()}
      />,
    );

    expect(
      screen.queryByText("This property is close to the beach!"),
    ).not.toBeInTheDocument();
  });

  it("falls back to the monthly price when the listing is free", () => {
    render(
      <ListingClient
        listing={{ ...listing, price: 0 }}
        currentUser={makeUser()}
      />,
    );

    act(() => {
      dateRange.onChange?.({
        selection: {
          startDate: new Date(2024, 4, 1),
          endDate: new Date(2024, 4, 5),
          key: "selection",
        },
      });
    });

    expect(screen.getAllByText("¥ 0")).toHaveLength(2);
  });
});
