"use client";

import { Range } from "react-date-range";
import Calendar from "../Inputs/Calendar";
import Button from "../Button";

interface IListingReservationProps {
  price: number;
  dateRange: Range;
  selectedNights: number;
  totalPrice: number;
  onChangeDate: (value: Range) => void;
  onSubmit: () => void;
  disabled?: boolean;
  disabledDates?: Date[];
}

const ListingReservation: React.FC<IListingReservationProps> = ({
  price,
  dateRange,
  selectedNights,
  totalPrice,
  onChangeDate,
  onSubmit,
  disabled,
  disabledDates = [],
}) => {
  return (
    <div
      className="
        bg-white
        rounded-xl
        border-[1px]
        border-neutral-200
        overflow-hidden
      "
    >
      <div className="flex flex-row items-center gap-1 p-4">
        <div className="text-2xl font-semibold">¥ {price}</div>
        <div className="font-light text-neutral-600">／月</div>
      </div>
      <hr />
      <Calendar
        value={dateRange}
        disabledDates={disabledDates}
        onChange={(value) => onChangeDate(value.selection)}
      />
      <hr />
      <div className="p-4">
        <div className="mb-3 text-sm text-neutral-600">
          {selectedNights >= 30
            ? `已選擇 ${selectedNights} 晚`
            : `至少入住 30 晚（目前 ${Math.max(0, selectedNights)} 晚）`}
        </div>
        <Button disabled={disabled} onClick={onSubmit} label="送出入住申請" />
      </div>
      <div
        className="
        p-4
        flex
        flex-row
        items-center
        justify-between
        font-semibold
        text-lg
        "
      >
        <div>預估總額</div>
        <div>¥ {totalPrice}</div>
      </div>
    </div>
  );
};

export default ListingReservation;
