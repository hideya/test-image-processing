import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useMeasurementActions } from '@/hooks/use-measurement-actions';
import { useMeasurementDeletion } from '@/context/measurement-deletion-context';
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
import { cn } from '@/lib/utils';

interface MeasurementActionToolbarProps {
  measurementId: number;
  date: string;
  onEdit: () => void;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const MeasurementActionToolbar: React.FC<MeasurementActionToolbarProps> = ({
  measurementId,
  date,
  onEdit,
  onClose,
  className,
  style,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const { onMeasurementDeleted } = useMeasurementDeletion();
  const { deleteMeasurement, isDeleting } = useMeasurementActions();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteMeasurement(measurementId);
    onMeasurementDeleted(measurementId, date);
    setShowDeleteConfirm(false);
    onClose();
  };

  // Format date to display month/day
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <>
      <div 
        className={cn(
          "bg-white shadow-xl rounded-lg py-2 px-3 flex items-center space-x-3 border border-gray-200 animate-in fade-in-50 zoom-in-95 duration-200",
          className
        )}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs text-gray-500 font-medium pr-2 border-r border-gray-200">
          {formatDate(date)}
        </div>
        
        <button 
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full flex items-center justify-center" 
          onClick={handleEdit}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </button>
        
        <button 
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-full flex items-center justify-center"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete measurement?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the measurement for {formatDate(date)}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
