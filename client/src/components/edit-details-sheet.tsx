import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { IconPicker } from '@/components/icon-picker';
import { useMeasurementActions } from '@/hooks/use-measurement-actions';
import { format } from 'date-fns';
import { Check, Calendar, X } from 'lucide-react';
import { getIconsFromIds } from '@/lib/icons';
import { BaseMeasurement, CompleteMeasurement, isCompleteMeasurement } from '@/types/measurements';



interface EditDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: BaseMeasurement | null;
}

export function EditDetailsSheet({ open, onOpenChange, measurement }: EditDetailsSheetProps) {
  const [memo, setMemo] = useState('');
  const [selectedIcons, setSelectedIcons] = useState<number[]>([]);
  const { updateMetadata, isUpdating } = useMeasurementActions();

  // Reset form when measurement changes or sheet opens
  useEffect(() => {
    if (measurement && open) {
      setMemo(measurement.memo || '');
      
      // Parse icon IDs from string
      if (measurement.iconIds) {
        const iconIds = measurement.iconIds.split(',').map(id => parseInt(id, 10));
        setSelectedIcons(iconIds);
      } else {
        setSelectedIcons([]);
      }
    }
  }, [measurement, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (measurement && isCompleteMeasurement(measurement)) {
      updateMetadata({
        measurementId: measurement.id,
        memo: memo.trim() || undefined,
        iconIds: selectedIcons // Always pass the icons array, even when empty
      });
      
      // Close the sheet after a short delay to allow toast to show
      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    }
  };

  const formatMeasurementDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return format(date, 'yyyy年 M月 d日');
  };

  // Get day of week in Japanese
  const getDayOfWeek = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const weekDayJP = ["日", "月", "火", "水", "木", "金", "土"];
    return weekDayJP[dayOfWeek];
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <div className="absolute top-0 left-0 right-0 flex justify-center z-10">
          <div className="w-12 h-1 rounded-full bg-stone-300 mt-3 mb-1" />
        </div>
        <SheetHeader className="pt-6 pb-4">
          <SheetTitle>Edit Measurement Details</SheetTitle>
          <SheetDescription>
            Update notes and icons for this measurement
          </SheetDescription>
        </SheetHeader>
        
        {measurement && (
          <div className="space-y-6 pt-2 pb-16 px-1">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-blue-700 font-medium">
                  {formatMeasurementDate(measurement.date)}
                  <span className="ml-2 text-sm font-normal">
                    ({getDayOfWeek(measurement.date)}曜日)
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                  <p className="text-sm text-stone-500">Left Angle</p>
                  <p className="text-2xl font-semibold text-blue-700">{measurement.angle !== undefined ? measurement.angle.toFixed(1) : '-'}°</p>
                </div>
                <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                  <p className="text-sm text-stone-500">Right Angle</p>
                  <p className="text-2xl font-semibold text-purple-700">{measurement.angle2 !== undefined ? measurement.angle2.toFixed(1) : '-'}°</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="memo">Notes (Optional)</Label>
                <Input
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Add notes about this measurement..."
                  maxLength={100}
                  className="bg-stone-50 border-stone-200"
                />
                <p className="text-xs text-stone-500 text-right">{memo.length}/100</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-3">
                  <Label>Icons (Optional)</Label>
                  {selectedIcons.length === 3 && (
                    <p className="text-xs text-amber-600">
                      Max 3 selected
                    </p>
                  )}
                </div>
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                  <IconPicker 
                    selectedIcons={selectedIcons}
                    onChange={setSelectedIcons}
                    maxSelection={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={isUpdating}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <div className="flex items-center">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
