"use client";

import { useRouter } from "next/navigation";
import Container from "../components/Container";
import Heading from "../components/Heading";
import { Listing, Reservation, User } from "@prisma/client";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import ListingCard from "../components/listings/ListingCard";
import Button from "../components/Button";

interface ReservationsClientProps {
  reservations: (Reservation & { listing: Listing })[];
  currentUser: User | null;
}

const ReservationsClient: React.FC<ReservationsClientProps> = ({
  reservations,
  currentUser,
}) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const onDecision = useCallback(
    async (id: string, decision: "APPROVED" | "DECLINED") => {
      setUpdatingId(id);

      axios
        .patch(`/api/reservations/${id}`, { decision })
        .then(() => {
          toast.success(
            decision === "APPROVED"
              ? "已核准入住申請"
              : "已拒絕入住申請",
          );
          router.refresh();
        })
        .catch(() => {
          toast.error("發生錯誤，請稍後再試");
        })
        .finally(() => {
          setUpdatingId("");
        });
    },
    [router],
  );

  const onCancel = useCallback(
    async (id: string) => {
      setDeletingId(id);

      axios
        .delete(`/api/reservations/${id}`)
        .then(() => {
          toast.success("預訂已取消");
          router.refresh();
        })
        .catch(() => {
          toast.error("發生錯誤，請稍後再試");
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router]
  );

  return (
    <Container>
      <Heading title="房客申請" subtitle="審核與管理房源的入住申請" />
      <div
        className="
          mt-10
          grid
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-3
          lg:grid-cols-4
          xl:grid-cols-5
          2xl:grid-cols-6
          gap-8
        "
      >
        {reservations.map((reservation) => (
          <div key={reservation.id} className="flex flex-col gap-2">
            <ListingCard
              data={reservation.listing}
              reservation={reservation}
              actionId={reservation.id}
              onAction={
                reservation.status === "APPROVED" ? onCancel : undefined
              }
              disabled={deletingId === reservation.id}
              actionLabel={
                reservation.status === "APPROVED"
                  ? "取消房客預訂"
                  : undefined
              }
              currentUser={currentUser}
            />
            {reservation.status === "PENDING" && (
              <div className="flex flex-col gap-2">
                <Button
                  small
                  label="核准申請"
                  disabled={updatingId === reservation.id}
                  onClick={() => onDecision(reservation.id, "APPROVED")}
                />
                <Button
                  small
                  outline
                  label="拒絕申請"
                  disabled={updatingId === reservation.id}
                  onClick={() => onDecision(reservation.id, "DECLINED")}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Container>
  );
};

export default ReservationsClient;
