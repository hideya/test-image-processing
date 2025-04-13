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
  formatTableDayPart: (dateStr: string) => string;
}

export const TodaySummary: React.FC<TodaySummaryProps> = ({
  today,
  todayMeasurement,
  formatTableDayPart,
}) => {
  return (
    <Link href="/upload">
      <div className="bg-blue-50 p-4 rounded-full">
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-end gap-1">
            <div className="text-xl font-medium text-blue-800 mt-1">
              {format(new Date(today), "M月 d日")}
            </div>
            <div className="font-medium text-blue-800 mt-1.5">
              ({formatTableDayPart(today.toISOString())})
            </div>
          </div>
          {todayMeasurement ? (
            <>
              <div className="flex gap-2">
                <div className="text-sm font-medium text-blue-600 mt-2">
                  左足
                </div>
                <div className="text-2xl font-semibold text-blue-800">
                  {todayMeasurement.angle !== undefined
                    ? todayMeasurement.angle.toFixed(1)
                    : "--"}
                  °
                </div>
              </div>
              <div className="flex gap-2">
                <div className="text-sm font-medium text-green-600 mt-2">
                  右足
                </div>
                <div className="text-2xl font-semibold text-green-700">
                  {todayMeasurement.angle2 !== undefined
                    ? todayMeasurement.angle2.toFixed(1)
                    : "--"}
                  °
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-500 mt-2 ml-4">
              未測定
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
