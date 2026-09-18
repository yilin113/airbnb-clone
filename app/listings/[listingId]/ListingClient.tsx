"use client";

import Container from "@/app/components/Container";
import ListingHead from "@/app/components/listings/ListingHead";
import ListingInfo from "@/app/components/listings/ListingInfo";
import ListingReservation from "@/app/components/listings/ListingReservation";
import { categories } from "@/app/components/navbar/Categories";
import useLoginModal from "@/app/hooks/useLoginModal";
import { Listing, Reservation, User } from "@prisma/client";
import axios from "axios";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  subDays,
} from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Range } from "react-date-range";
import toast from "react-hot-toast";
import { DEFAULT_PRICING_CONFIG } from "@/app/config/pricing";
import { calculateReservationQuote } from "@/app/domain/pricing";

const initialDateRange = {
  startDate: new Date(),
  endDate: new Date(),
  key: "selection",
};

interface IListingClientProps {
  reservations?: Reservation[];
  listing: Listing & {
    user: User;
  };
  currentUser?: User | null;
  pricingConfig?: typeof DEFAULT_PRICING_CONFIG;
}

const ListingClient: React.FC<IListingClientProps> = ({
  listing,
  currentUser,
  reservations = [],
  pricingConfig = DEFAULT_PRICING_CONFIG,
}) => {
  const loginModal = useLoginModal();
  const router = useRouter();

  const disableDates = useMemo(() => {
    let dates: Date[] = [];

    reservations.forEach((reservation) => {
      const range = eachDayOfInterval({
        start: new Date(reservation.startDate),
        end: subDays(new Date(reservation.endDate), 1),
      });

      dates = [...dates, ...range];
    });

    return dates;
  }, [reservations]);

  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<Range>(initialDateRange);

  const selectedNights = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return 0;
    }

    return differenceInCalendarDays(dateRange.endDate, dateRange.startDate);
  }, [dateRange]);

  const totalPrice = useMemo(() => {
    if (dateRange.startDate && dateRange.endDate) {
      const dayCount = selectedNights;

      if (dayCount && listing.price) {
        return calculateReservationQuote({
          nights: dayCount,
          monthlyRent: listing.price,
          monthlyUtilities: listing.utilitiesFee,
          monthlyManagement: listing.managementFee,
          cleaningFee: listing.cleaningFee,
          deposit: listing.deposit,
          ...pricingConfig,
        }).totalPrice;
      }
    }

    return listing.price;
  }, [dateRange, listing, pricingConfig, selectedNights]);

  const onCreateReservation = useCallback(async () => {
    if (!currentUser) {
      return loginModal.onOpen();
    }

    if (!dateRange.startDate || !dateRange.endDate) {
      return;
    }

    if (selectedNights < 30) {
      toast.error("中期旅居至少需要入住 30 晚");
      return;
    }

    setIsLoading(true);

    axios
      .post("/api/reservations", {
        startDate: format(dateRange.startDate, "yyyy-MM-dd"),
        endDate: format(dateRange.endDate, "yyyy-MM-dd"),
        listingId: listing.id,
      })
      .then(() => {
        toast.success("入住申請已送出");
        setDateRange(initialDateRange);
        router.push("/trips");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [dateRange, listing.id, currentUser, loginModal, router, selectedNights]);

  const category = useMemo(() => {
    return categories.find((item) => item.label === listing.category);
  }, [listing.category]);

  return (
    <Container>
      <div className="max-w-screen-lg mx-auto">
        <div className="flex flex-col gap-6">
          <ListingHead
            title={listing.title}
            imageSrc={listing.imageSrc}
            imageSrcs={listing.imageSrcs}
            locationValue={listing.locationValue}
            id={listing.id}
            currentUser={currentUser}
          />
          <div
            className="
            grid
            grid-cols-1
            md:grid-cols-7
            md:gap-10
            gap-6
            align-center
          "
          >
            <ListingInfo
              user={listing.user}
              category={category}
              description={listing.description}
              roomCount={listing.roomCount}
              guestCount={listing.guestCount}
              bathroomCount={listing.bathroomCount}
              locationValue={listing.locationValue}
            />
            <div
              className=" 
                col-span-4               
                order-first
                mb-10
                md:order-last
                md:col-span-3
              "
            >
              <ListingReservation
                price={listing.price}
                totalPrice={totalPrice}
                onChangeDate={(value: Range) => setDateRange(value)}
                dateRange={dateRange}
                selectedNights={selectedNights}
                onSubmit={onCreateReservation}
                disabled={isLoading || selectedNights < 30}
                disabledDates={disableDates}
              />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ListingClient;
