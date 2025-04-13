import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

interface DateConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formattedDate: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DateConflictDialog: React.FC<DateConflictDialogProps> = ({
  open,
  onOpenChange,
  formattedDate,
  onConfirm,
  onCancel,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Replace Existing Measurement?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You already have a measurement for{" "}
            <strong>{formattedDate}</strong>. Uploading this new
            image will replace the existing measurement for this date. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-500 hover:bg-amber-600"
          >
            Yes, Replace
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
