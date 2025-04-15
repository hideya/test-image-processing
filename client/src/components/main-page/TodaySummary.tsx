import React, { useState } from "react";
import { format } from "date-fns";
import { BaseMeasurement } from "@/types/measurements";
import { UploadSheet } from "@/components/upload-sheet";



interface TodaySummaryProps {
  today: Date;
  todayMeasurement: BaseMeasurement | undefined;
  isLoading?: boolean;
  formatTableDayPart: (dateStr: string) => string;
  onUploadComplete?: () => void;
}

export const TodaySummary: React.FC<TodaySummaryProps> = ({
  today,
  todayMeasurement,
  isLoading = false,
  formatTableDayPart,
  onUploadComplete,
}) => {
  console.log('Debug - TodaySummary props:', { 
    today: today.toISOString(), 
    todayMeasurement, 
    isLoading 
  });
  return (
    <div>
      <div className="bg-gradient-to-b from-white to-[var(--theme-color)] p-4 rounded-2xl shadow-sm mb-2">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-theme-dark">
                {format(new Date(today), "M月 d日")}
              </div>
              <div className="text-lg font-medium text-theme-dark">
                {formatTableDayPart(today.toISOString())}曜日
              </div>
            </div>
          </div>
          <div className="flex gap-6 items-center">
            {isLoading ? (
              <div className="flex flex-col items-center bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="text-blue-700 font-medium mb-1">Loading today's data...</div>
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : todayMeasurement ? (
              <>
                <div className="bg-gradient-to-b from-white to-[var(--theme-color-light)] p-4 rounded-xl shadow-sm border border-white flex flex-col items-center transition-transform hover:scale-105">
                  <div className="text-sm font-medium text-blue-600 mb-1">
                    左足
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    {todayMeasurement.angle !== undefined
                      ? todayMeasurement.angle.toFixed(1)
                      : "--"}
                    °
                  </div>
                </div>
                <div className="bg-gradient-to-b from-white to-[var(--theme-color-light)] p-4 rounded-xl shadow-sm border border-white flex flex-col items-center transition-transform hover:scale-105">
                  <div className="text-sm font-medium text-green-600 mb-1">
                    右足
                  </div>
                  <div className="text-3xl font-bold text-green-700">
                    {todayMeasurement.angle2 !== undefined
                      ? todayMeasurement.angle2.toFixed(1)
                      : "--"}
                    °
                  </div>
                </div>
              </>
            ) : (
              <UploadSheet onComplete={onUploadComplete}>
                <div className="flex flex-col items-center bg-white hover:opacity-75 transition-colors p-4 rounded-xl cursor-pointer">
                  <div className="text-theme-dark font-medium mb-1">No measurement today</div>
                  <div className="text-theme-dark text-sm">Tap to upload a photo</div>
                </div>
              </UploadSheet>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
