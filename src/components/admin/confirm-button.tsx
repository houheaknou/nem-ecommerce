"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAdminText } from "@/i18n/admin-text-context";

/** Wraps a trigger button in a confirmation dialog. */
export function ConfirmButton({
  children,
  onConfirm,
  title,
  description,
  confirmLabel,
}: {
  children: React.ReactNode;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}) {
  const { a } = useAdminText();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? a.common.confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? a.common.confirmDelete}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">{a.common.cancel}</AlertDialogCancel>
          <AlertDialogAction className="rounded-full" onClick={onConfirm}>
            {confirmLabel ?? a.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
