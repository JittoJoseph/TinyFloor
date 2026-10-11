"use client";

import type { ReactNode } from "react";
import { Modal } from "./Modal";

/** A titled dialog: a question, what it means, and its buttons, in the app's modal. */
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
    <Modal open={open} onClose={onClose} label={title} closeLabel={closeLabel} className={className}>
      <div className="px-6 pb-2 pt-6 pe-14">
        <h2 className="text-[17px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="px-6 py-3">{children}</div>}
      {footer && <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-3">{footer}</div>}
    </Modal>
  );
}
