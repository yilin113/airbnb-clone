"use client";

import useCountries from "@/app/hooks/useCountries";
import { User } from "@prisma/client";
import { IconType } from "react-icons";
import Avatar from "../Avatar";
import ListingCategory from "./ListingCategory";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("../Map"), {
  ssr: false,
});

interface IListingInfoProps {
  user: User;
  description: string;
  guestCount: number;
  roomCount: number;
  bathroomCount: number;
  locationValue: string;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  category:
    | {
        label: string;
        icon: IconType;
        description: string;
      }
    | undefined;
}

const ListingInfo: React.FC<IListingInfoProps> = ({
  user,
  description,
  guestCount,
  roomCount,
  bathroomCount,
  locationValue,
  locationLatitude,
  locationLongitude,
  category,
}) => {
  const { getByValue } = useCountries();

  const coordinates =
    locationLatitude != null && locationLongitude != null
      ? ([locationLatitude, locationLongitude] as [number, number])
      : getByValue(locationValue)?.latlng;

  return (
    <div className="col-span-4 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div
          className="
            text-xl
            font-semibold
            flex
            flex-row
            items-center
            gap-2
          "
        >
          <div>房東：{user?.name}</div>
          <Avatar src={user?.image} />
        </div>
        <div
          className="
            flex
            flex-row
            items-center
            gap-4
            font-light
            text-neutral-500
          "
        >
          <div>{guestCount} 位房客</div>
          <div>{roomCount} 間房</div>
          <div>{bathroomCount} 間衛浴</div>
        </div>
      </div>
      <hr />
      {category && (
        <ListingCategory
          icon={category.icon}
          label={category.label}
          description={category.description}
        />
      )}
      <hr />
      <div className="text-lg font-light text-neutral-500">{description}</div>
      <hr />
      <Map center={coordinates} />
    </div>
  );
};

export default ListingInfo;
