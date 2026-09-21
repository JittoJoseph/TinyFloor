"use client";

import type { ReactNode } from "react";
import { CenterMorphModal, CenterMorphModalContent } from "@/components/motion/center-morph-modal";
import { cn } from "@/lib/utils";

/** A dialog that unfolds from its centre (beUI's center morph modal). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  closeLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeLabel: string;
}) {
  return (
    <CenterMorphModal open={open} onOpenChange={(next) => !next && onClose()}>
      <CenterMorphModalContent
        ariaLabel={title}
        closeButtonLabel={closeLabel}
        className={cn("max-w-[28rem] rounded-[26px] bg-card", className)}
        backdropClassName="bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"
      >
        <div className="px-6 pb-2 pt-6 pe-14">
          <h2 className="text-[17px] font-semibold tracking-tight text-foreground">{title}</h2>
          {description && <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="px-6 py-3">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-3">{footer}</div>}
      </CenterMorphModalContent>
    </CenterMorphModal>
  );
}
