import React, { useState } from "react";
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
  
  // Handle row click
  const handleRowClick = (measurement: BaseMeasurement) => {
    // Only show action toolbar for measurements that have data
    if (measurement.angle !== undefined) {
      // If clicking same row that has active actions, clear the selection
      if (activeActionRow === measurement.date) {
        setActiveActionRow(null);
        setSelectedDate(null);
        setPulsingDot(null);
      } else {
        // Otherwise set this row as active
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
      {/* Position action toolbar outside of the table structure */}
      {activeActionRow && (
        <div className="sticky top-0 z-50 flex justify-center w-full mb-2">
          {sortedMeasurements.map((measurement) => {
            if (activeActionRow === measurement.date && measurement.angle !== undefined && measurement.id) {
              return (
                <MeasurementActionToolbar
                  key={`toolbar-${measurement.date}`}
                  measurementId={measurement.id}
                  date={measurement.date}
                  onEdit={() => handleEditMeasurement(measurement)}
                  onClose={() => setActiveActionRow(null)}
                />
              );
            }
            return null;
          })}
        </div>
      )}

      <div className="max-h-[64rem] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-10 pl-2 pr-0 py-1 text-center text-xs font-medium text-gray-500 uppercase">
              日付
            </th>
            <th className="w-9 pl-2 py-1 text-center text-xs font-medium text-blue-600 uppercase">
              左
            </th>
            <th className="w-9 pl-1 py-1 text-center text-xs font-medium text-emerald-600 uppercase">
              右
            </th>
            <th className="px-0 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              メ モ
            </th>
            <th className="w-20 text-center">
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedMeasurements.map((measurement, index) => {
            const isSun = isSunday(measurement.date);
            const isSat = isSaturday(measurement.date);
            let textColor = "#6b7280"; // Default gray

            if (isSun) {
              textColor = "#ef4444"; // Red for Sunday
            } else if (isSat) {
              textColor = "#3b82f6"; // Blue for Saturday
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
                        : index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  onClick={() => handleRowClick(measurement)}
                >
                  {/* Action toolbar moved outside of the tr element */}
                  <td
                    className={`pl-1 pr-2 whitespace-nowrap text-sm ${isSelected ? "font-medium text-blue-900" : isToday ? "font-medium text-amber-800" : "text-gray-900"}`}
                  >
                    <div 
                      className={`text-right leading-tight flex items-center justify-end`}
                      style={{ color: textColor }}
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
                    className={`pl-2 pr-0 text-sm ${isSelected ? "font-medium text-blue-900" : isToday ? "font-medium text-amber-800" : "text-gray-900"}`}
                  >
                    <span
                      className={`transition-all duration-200`}
                    >
                      {measurement.memo || ""}
                    </span>
                  </td>
                  <td
                    className={`pl-1 pr-0 text-center text-sm ${isSelected ? "font-medium text-blue-900" : isToday ? "font-medium text-amber-800" : "text-gray-900"}`}
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
