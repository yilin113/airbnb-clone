"use client";

import { useCallback, useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import Button from "../Button";

interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  body?: React.ReactElement;
  footer?: React.ReactElement;
  actionLabel: string;
  disabled?: boolean;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  body,
  footer,
  actionLabel,
  disabled,
  secondaryAction,
  secondaryActionLabel,
}) => {
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    // Drives the open/close transition: the modal renders in its "closed"
    // position first, then animates once this state catches up with the prop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowModal(isOpen);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (disabled) {
      return;
    }

    setShowModal(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [disabled, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      handleClose();
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [handleClose, isOpen]);

  const handleOverlayMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Only a press landing on the backdrop itself dismisses the modal.
      // Listening on mousedown rather than click keeps a text selection that
      // starts inside the panel and ends on the backdrop from closing it.
      if (event.target !== event.currentTarget) {
        return;
      }

      handleClose();
    },
    [handleClose]
  );

  const handleSubmit = useCallback(() => {
    if (disabled) {
      return;
    }

    onSubmit();
  }, [disabled, onSubmit]);

  const handleSecondaryAction = useCallback(() => {
    if (disabled || !secondaryAction) {
      return;
    }

    secondaryAction();
  }, [disabled, secondaryAction]);

  if (!isOpen) return null;

  return (
    <>
      <div
        onMouseDown={handleOverlayMouseDown}
        className="
          justify-center
          items-center
          flex
          overflow-x-hidden
          overflow-y-hidden
          fixed
          inset-0
          p-0
          md:p-6
          z-50
          outline-none
          focus:outline-none
          bg-neutral-800/70
        "
      >
        <div
          className="
            relative
            w-full
            md:w-4/6
            lg:w-3/6
            xl:w-2/5
            mx-auto
            h-full
            md:h-auto
            md:max-h-[calc(100dvh-3rem)]
          "
        >
          {/*content*/}
          <div
            className={`
              translate
              duration-300
              h-full
              ${showModal ? "translate-y-0" : "translate-y-full"}
              ${showModal ? "opacity-100" : "opacity-0"}
            `}
          >
            <div
              className="
                translate
                h-full
                md:h-auto
                max-h-[100dvh]
                md:max-h-[calc(100dvh-3rem)]
                border-0
                rounded-lg
                shadow-lg
                relative
                flex
                flex-col
                overflow-hidden
                w-full
                bg-white
                outline-none
                focus:outline-none
              "
            >
              {/*header*/}
              <div
                className="
                  flex 
                  items-center
                  p-6
                  rounded-t
                  justify-center
                  relative
                  shrink-0
                  border-b-[1px]
                "
              >
                <button
                  onClick={handleClose}
                  className="
                    p-1
                    border-0
                    hover:opacity-70
                    transition
                    absolute
                    left-9
                  "
                >
                  <IoMdClose size={18} />
                </button>
                <div
                  className="
                    text-lg
                    font-semibold
                  "
                >
                  {title}
                </div>
              </div>
              {/*body*/}
              <div
                data-testid="modal-body"
                className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-6"
              >
                {body}
              </div>
              {/*footer*/}
              <div
                data-testid="modal-footer"
                className="flex shrink-0 flex-col gap-2 border-t border-neutral-200 bg-white p-4 md:p-6"
              >
                <div
                  className="
                    flex
                    flex-row
                    items-center
                    gap-4
                    w-full
                  "
                >
                  {secondaryAction && secondaryActionLabel && (
                    <Button
                      outline
                      disabled={disabled}
                      onClick={handleSecondaryAction}
                      label={secondaryActionLabel}
                    />
                  )}
                  <Button
                    disabled={disabled}
                    onClick={handleSubmit}
                    label={actionLabel}
                  />
                </div>
                {footer}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
