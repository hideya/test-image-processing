import React from "react";
import { format } from "date-fns";
import { Link } from "wouter";

interface Measurement {
  date: string;
  angle: number;
  angle2: number;
  imageId: number;
  hashKey: string;
  memo?: string;
  iconIds?: string;
}

interface TodaySummaryProps {
  today: Date;
  todayMeasurement: Measurement | undefined;
  isLoading?: boolean;
  formatTableDayPart: (dateStr: string) => string;
}

export const TodaySummary: React.FC<TodaySummaryProps> = ({
  today,
  todayMeasurement,
  isLoading = false,
  formatTableDayPart,
}) => {
  console.log('Debug - TodaySummary props:', { 
    today: today.toISOString(), 
    todayMeasurement, 
    isLoading 
  });
  return (
    <div>
      <div className="bg-gradient-to-b from-blue-50 to-indigo-500 p-6 rounded-2xl shadow-sm border border-blue-100 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start">
            <div className="text-sm text-blue-600 uppercase font-medium mb-1">Today</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-gray-800">
                {format(new Date(today), "M月 d日")}
              </div>
              <div className="text-lg font-medium text-gray-600">
                ({formatTableDayPart(today.toISOString())}曜日)
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center transition-transform hover:scale-105">
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col items-center transition-transform hover:scale-105">
                  <div className="text-sm font-medium text-purple-600 mb-1">
                    右足
                  </div>
                  <div className="text-3xl font-bold text-purple-700">
                    {todayMeasurement.angle2 !== undefined
                      ? todayMeasurement.angle2.toFixed(1)
                      : "--"}
                    °
                  </div>
                </div>
              </>
            ) : (
              <Link href="/upload">
                <div className="flex flex-col items-center bg-blue-50 hover:bg-blue-100 transition-colors p-4 rounded-xl border border-blue-200 cursor-pointer">
                  <div className="text-blue-700 font-medium mb-1">No measurement today</div>
                  <div className="text-blue-500 text-sm">Tap to upload a photo</div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
