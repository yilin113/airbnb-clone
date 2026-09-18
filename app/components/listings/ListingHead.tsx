"use client";

import useCountries from "@/app/hooks/useCountries";
import { User } from "@prisma/client";
import Heading from "../Heading";
import Image from "next/image";
import HeartButton from "../HeartButton";

interface IListingHeadProps {
  title: string;
  locationValue: string;
  imageSrc: string;
  imageSrcs?: string[];
  id: string;
  currentUser?: User | null;
}

const ListingHead: React.FC<IListingHeadProps> = ({
  title,
  locationValue,
  imageSrc,
  imageSrcs = [],
  id,
  currentUser,
}) => {
  const { getByValue } = useCountries();

  const location = getByValue(locationValue);
  const images = imageSrcs.length ? imageSrcs : [imageSrc];
  const visibleImages = images.slice(0, 5);

  return (
    <>
      <Heading
        title={title}
        subtitle={`${location?.region}, ${location?.label}`}
      />
      <div
        className={`relative grid h-[60vh] w-full overflow-hidden rounded-xl ${
          visibleImages.length > 1 ? "grid-cols-2 grid-rows-2 gap-1" : ""
        }`}
      >
        {visibleImages.map((image, index) => (
          <div
            key={image}
            className={`relative overflow-hidden ${
              visibleImages.length > 1 && index === 0 ? "row-span-2" : ""
            } ${visibleImages.length > 3 && index > 2 ? "hidden md:block" : ""}`}
          >
            <Image
              alt={index === 0 ? "Image" : `房源照片 ${index + 1}`}
              src={image}
              fill
              sizes={index === 0 ? "100%" : "50vw"}
              className="h-full w-full object-cover"
            />
            {index === visibleImages.length - 1 && images.length > 5 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">
                +{images.length - 5} 張
              </div>
            )}
          </div>
        ))}
        <div className="absolute top-5 right-5">
          <HeartButton listingId={id} currentUser={currentUser} />
        </div>
      </div>
    </>
  );
};

export default ListingHead;
