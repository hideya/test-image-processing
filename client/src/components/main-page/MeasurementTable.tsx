import React from "react";
import { IconDisplay } from "@/components/icon-picker";

interface Measurement {
  date: string;
  angle?: number;
  angle2?: number;
  imageId?: number;
  hashKey?: string;
  memo?: string;
  iconIds?: string;
}

interface MeasurementTableProps {
  sortedMeasurements: Measurement[];
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  setPulsingDot: (date: string | null) => void;
  isSunday: (dateStr: string) => boolean;
  isSaturday: (dateStr: string) => boolean;
  formatTableDatePart: (dateStr: string) => string;
  formatTableDayPart: (dateStr: string) => string;
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
}) => {
  return (
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
            return (
              <React.Fragment key={index}>
                <tr
                  className={`cursor-pointer transition-colors duration-150
                    ${
                      isSelected
                        ? "bg-blue-50 hover:bg-blue-100"
                        : index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  onClick={() => {
                    if (selectedDate === measurement.date) {
                      setSelectedDate(null);
                      setPulsingDot(null);
                    } else {
                      setPulsingDot(measurement.date);
                      setSelectedDate(measurement.date);
                    }
                  }}
                >
                  <td
                    className={`pl-1 pr-2 whitespace-nowrap text-sm ${isSelected ? "font-medium text-blue-900" : "text-gray-900"}`}
                  >
                    <div
                      className="text-right leading-tight"
                      style={{ color: textColor }}
                    >
                      {formatTableDatePart(measurement.date)}
                      &nbsp;
                      <span className={"text-xs font-mono"}>
                        {formatTableDayPart(measurement.date)}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`px-1 whitespace-nowrap text-sm text-right ${isSelected ? "font-medium text-blue-700" : "text-blue-600"}`}
                  >
                    {measurement.angle !== undefined
                      ? measurement.angle.toFixed(1)
                      : ""}
                  </td>
                  <td
                    className={`px-1 whitespace-nowrap text-sm text-right ${isSelected ? "font-medium text-emerald-700" : "text-emerald-600"}`}
                  >
                    {measurement.angle2 !== undefined
                      ? measurement.angle2.toFixed(1)
                      : ""}
                  </td>
                  <td
                    className={`pl-2 pr-0 text-sm ${isSelected ? "font-medium text-blue-900" : "text-gray-900"}`}
                  >
                    <span
                      className={`transition-all duration-200`}
                    >
                      {measurement.memo || ""}
                    </span>
                  </td>
                  <td
                    className={`pl-1 pr-0 text-center text-sm ${isSelected ? "font-medium text-blue-900" : "text-gray-900"}`}
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
  );
};
