import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SearchModal from "@/app/components/modals/SearchModal";
import useSearchModal from "@/app/hooks/useSearchModal";
import { navigationState, routerMock, setSearchParams } from "../helpers/mocks";

vi.mock("@/app/components/Map", () => ({
  default: () => <div data-testid="map" />,
}));

const dateRange = vi.hoisted(() => ({
  onChange: undefined as undefined | ((value: { selection: unknown }) => void),
}));

vi.mock("react-date-range", () => ({
  DateRange: ({
    onChange,
  }: {
    onChange: (value: { selection: unknown }) => void;
  }) => {
    dateRange.onChange = onChange;
    return <div data-testid="date-range" />;
  },
}));

beforeEach(() => {
  useSearchModal.setState({ isOpen: true });
});

const next = () =>
  userEvent.click(screen.getByRole("button", { name: "下一步" }));

describe("SearchModal", () => {
  it("stays hidden while its store is closed", () => {
    useSearchModal.setState({ isOpen: false });
    const { container } = render(<SearchModal />);

    expect(container).toBeEmptyDOMElement();
  });

  it("starts on the location step with no way back", () => {
    render(<SearchModal />);

    expect(screen.getByText("想住在日本哪裡？")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "返回" }),
    ).not.toBeInTheDocument();
  });

  it("walks forwards and backwards through the steps", async () => {
    render(<SearchModal />);

    const country = screen.getByRole("combobox");
    await userEvent.click(country);
    await userEvent.type(country, "新宿");
    await userEvent.keyboard("{Enter}");

    await next();
    expect(screen.getByText("預計何時入住？")).toBeInTheDocument();

    dateRange.onChange?.({
      selection: {
        startDate: new Date(2024, 4, 1),
        endDate: new Date(2024, 4, 5),
        key: "selection",
      },
    });

    await next();
    expect(screen.getByText("住宿需求")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜尋" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.getByText("預計何時入住？")).toBeInTheDocument();
  });

  it("edits all three counters", async () => {
    render(<SearchModal />);

    await next();
    await next();

    const steppers = Array.from(
      document.querySelectorAll<HTMLElement>(".cursor-pointer"),
    );
    // [guest -, guest +, room -, room +, bathroom -, bathroom +]
    await userEvent.click(steppers[1]);
    await userEvent.click(steppers[3]);
    await userEvent.click(steppers[5]);

    expect(screen.getAllByText("2")).toHaveLength(3);
  });

  it("pushes the assembled query and closes", async () => {
    render(<SearchModal />);

    await next();
    await next();
    await userEvent.click(screen.getByRole("button", { name: "搜尋" }));

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledTimes(1);
    });

    const url = routerMock.push.mock.calls[0][0] as string;
    expect(url).toContain("guestCount=1");
    expect(url).toContain("roomCount=1");
    expect(url).toContain("bathroomCount=1");
    expect(url).toContain("startDate=");
    expect(url).toContain("endDate=");
    expect(useSearchModal.getState().isOpen).toBe(false);
  });

  it("keeps the filters already in the url", async () => {
    setSearchParams({ category: "Beach" });
    render(<SearchModal />);

    await next();
    await next();
    await userEvent.click(screen.getByRole("button", { name: "搜尋" }));

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledTimes(1);
    });
    expect(routerMock.push.mock.calls[0][0]).toContain("category=Beach");
  });

  it("leaves the dates out of the query when none are picked", async () => {
    render(<SearchModal />);

    await next();
    act(() => {
      dateRange.onChange?.({ selection: { key: "selection" } });
    });

    await next();
    await userEvent.click(screen.getByRole("button", { name: "搜尋" }));

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledTimes(1);
    });

    const url = routerMock.push.mock.calls[0][0] as string;
    expect(url).not.toContain("startDate=");
    expect(url).not.toContain("endDate=");
  });

  it("copes with no search params at all", async () => {
    navigationState.searchParams = null;
    render(<SearchModal />);

    await next();
    await next();
    await userEvent.click(screen.getByRole("button", { name: "搜尋" }));

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledTimes(1);
    });
  });
});
