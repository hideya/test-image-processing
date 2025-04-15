import React, { useState, useEffect, useRef } from "react";
import { IconDisplay } from "@/components/icon-picker";
import { MeasurementActionToolbar } from "./MeasurementActionToolbar";
import { EditDetailsSheet } from "@/components/edit-details-sheet";
import { BaseMeasurement } from "@/types/measurements";

// Using the BaseMeasurement type imported from shared types file

interface MeasurementTableProps {
  sortedMeasurements: BaseMeasurement[];
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  setPulsingDot: (date: string | null) => void;
  isSunday: (dateStr: string) => boolean;
  isSaturday: (dateStr: string) => boolean;
  formatTableDatePart: (dateStr: string) => string;
  formatTableDayPart: (dateStr: string) => string;
  todayDate: string; // Today's date in ISO format (YYYY-MM-DD)
}

export const MeasurementTable: React.FC<MeasurementTableProps> = ({
  sortedMeasurements,
  selectedDate,
  setSelectedDate,
  setPulsingDot,
  isSunday,
  isSaturday,
  formatTableDatePart,
  formatTableDayPart,
  todayDate,
}) => {
  const [activeActionRow, setActiveActionRow] = useState<string | null>(null);
  const [editMeasurement, setEditMeasurement] = useState<BaseMeasurement | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [activeRowPosition, setActiveRowPosition] = useState<{top: number, left: number, width: number} | null>(null);
  
  // Ref for the toolbar element
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Handle clicks outside the toolbar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Skip if toolbar is not shown
      if (!activeActionRow || !toolbarRef.current) return;
      
      // Check if the click is outside the toolbar
      // AND also not on a table row that has the active toolbar
      if (!toolbarRef.current.contains(e.target as Node)) {
        const clickedRow = (e.target as Element).closest('tr');
        const activeRowElement = document.querySelector(`tr[data-date="${activeActionRow}"]`);
        
        // If clicked outside toolbar and not on the active row
        if (!clickedRow || clickedRow !== activeRowElement) {
          setActiveActionRow(null);
          setActiveRowPosition(null);
          setSelectedDate(null);
          setPulsingDot(null);
        }
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeActionRow, setSelectedDate, setPulsingDot]);
  
  // Handle row click
  const handleRowClick = (measurement: BaseMeasurement, e: React.MouseEvent<HTMLTableRowElement>) => {
    // Only show action toolbar for measurements that have data
    if (measurement.angle !== undefined) {
      // If clicking same row that has active actions, clear the selection
      if (activeActionRow === measurement.date) {
        setActiveActionRow(null);
        setSelectedDate(null);
        setPulsingDot(null);
        setActiveRowPosition(null);
      } else {
        // Otherwise set this row as active
        const row = e.currentTarget;
        const rect = row.getBoundingClientRect();
        const tableContainer = row.closest('.max-h-\\[64rem\\]');
        
        if (tableContainer) {
          const tableRect = tableContainer.getBoundingClientRect();
          // Calculate position relative to the table container
          setActiveRowPosition({
            top: rect.top - tableRect.top + tableContainer.scrollTop,
            left: rect.left,
            width: rect.width
          });
        }
        
        setActiveActionRow(measurement.date);
        setSelectedDate(measurement.date);
        setPulsingDot(measurement.date);
      }
    }
  };
  
  // Open edit sheet for a measurement
  const handleEditMeasurement = (measurement: BaseMeasurement) => {
    setEditMeasurement(measurement);
    setShowEditSheet(true);
    setActiveActionRow(null); // Hide the action toolbar
  };
  return (
    <div className="relative">
      {/* Position action toolbar as absolute to float above the selected row */}
      {activeActionRow && activeRowPosition && (
        <div 
          className="absolute z-50 pointer-events-none"
          style={{
            top: `${activeRowPosition.top - 10}px`, // Position slightly above the row
            left: 0,
            right: 0,
            width: '100%'
          }}
        >
          <div className="flex justify-center" ref={toolbarRef}>
            {sortedMeasurements.map((measurement) => {
              if (activeActionRow === measurement.date && measurement.angle !== undefined && measurement.id) {
                return (
                  <MeasurementActionToolbar
                    key={`toolbar-${measurement.date}`}
                    measurementId={measurement.id}
                    date={measurement.date}
                    onEdit={() => handleEditMeasurement(measurement)}
                    onClose={() => {
                      setActiveActionRow(null);
                      setActiveRowPosition(null);
                    }}
                    className="pointer-events-auto transform -translate-y-full"
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      <div className="max-h-[64rem] overflow-y-auto">
        <table className="min-w-full divide-y divide-stone-200">
        <thead className="bg-gradient-to-b from-white to-[var(--theme-color-light)]">
          <tr>
            <th className="w-10 pl-2 pr-0 py-1 text-center text-xs font-medium text-stone-500 uppercase">
              日付
            </th>
            <th className="w-9 pl-2 py-1 text-center text-xs font-medium text-blue-600 uppercase">
              左
            </th>
            <th className="w-9 pl-1 py-1 text-center text-xs font-medium text-emerald-600 uppercase">
              右
            </th>
            <th className="px-0 py-1 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">
              メ モ
            </th>
            <th className="w-20 text-center">
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-stone-200">
          {sortedMeasurements.map((measurement, index) => {
            const isSun = isSunday(measurement.date);
            const isSat = isSaturday(measurement.date);
            let dateTextColor = "text-stone-500"; // Default gray

            if (isSun) {
              dateTextColor = "text-red-500"; // Red for Sunday
            } else if (isSat) {
              dateTextColor = "text-blue-500"; // Blue for Saturday
            }
            const isSelected = selectedDate === measurement.date;
            const isToday = measurement.date === todayDate;
            return (
              <React.Fragment key={index}>
                <tr
                  className={`cursor-pointer transition-colors duration-150 relative
                    ${isSelected
                      ? "bg-blue-50 hover:bg-blue-100"
                      : isToday
                        ? "bg-yellow-50 hover:bg-yellow-100" 
                        : index % 2 === 1
                          ? "bg-gradient-to-b from-white to-[var(--theme-color-light)] hover:opacity-75"
                          : "bg-stone-0 hover:opacity-75"
                    }`}
                  onClick={(e) => handleRowClick(measurement, e)}
                  data-date={measurement.date}
                >
                  {/* Action toolbar moved outside of the tr element */}
                  <td
                    className={`pl-1 pr-2 whitespace-nowrap text-sm ${isSelected ? "font-medium text-blue-900" : isToday ? "font-medium text-amber-800" : "text-gray-900"}`}
                  >
                    <div 
                      className={`text-right leading-tight flex items-center justify-end ${dateTextColor}`}
                    >
                      <span
                        className={`${isToday ? "bg-amber-200 rounded font-medium" : ""}`}
                      >
                        {formatTableDatePart(measurement.date)}
                        &nbsp;
                        <span className="text-xs font-mono">
                          {formatTableDayPart(measurement.date)}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td
                    className={`px-1 whitespace-nowrap text-sm text-right ${isSelected ? "font-medium text-blue-700" : isToday ? "font-medium text-blue-600" : "text-blue-600"}`}
                  >
                    {measurement.angle !== undefined
                      ? measurement.angle.toFixed(1)
                      : ""}
                  </td>
                  <td
                    className={`px-1 whitespace-nowrap text-sm text-right ${isSelected ? "font-medium text-emerald-700" : isToday ? "font-medium text-emerald-600" : "text-emerald-600"}`}
                  >
                    {measurement.angle2 !== undefined
                      ? measurement.angle2.toFixed(1)
                      : ""}
                  </td>
                  <td
                    className={`pl-2 pr-0 text-sm ${isSelected ? "font-medium text-blue-900" : isToday ? "font-medium text-amber-800" : "text-stone-600"}`}
                  >
                    <span
                      className={`transition-all duration-200`}
                    >
                      {measurement.memo || ""}
                    </span>
                  </td>
                  <td
                    className={`pl-1 pr-0 text-center text-sm ${isSelected ? "font-medium text-blue-900" : isToday ? "font-medium opacity-100" : "opacity-75"}`}
                  >
                    {measurement.iconIds ? (
                      <span className="whitespace-nowrap">
                        <IconDisplay
                          iconIds={measurement.iconIds}
                          size="sm"
                        />
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        </table>
      </div>
      
      {/* Edit Details Sheet */}
      <EditDetailsSheet
        open={showEditSheet}
        onOpenChange={(open) => {
          setShowEditSheet(open);
          if (!open) {
            // When closing, clear the selected measurement
            setEditMeasurement(null);
          }
        }}
        measurement={editMeasurement}
      />
    </div>
  );
};
