import React from "react";
import { format } from "date-fns";

interface MonthNavigationProps {
  currentViewMonth: Date;
  setCurrentViewMonth: (date: Date) => void;
}

export const MonthNavigation: React.FC<MonthNavigationProps> = ({
  currentViewMonth,
  setCurrentViewMonth,
}) => {
  // Calculate if next month button should be disabled
  const isNextMonthDisabled = () => {
    const nextMonth = new Date(currentViewMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const today = new Date();
    return nextMonth > today;
  };

  return (
    <div className="flex items-center justify-between py-4 px-2 mb-4 border-b border-gray-200">
      <button
        onClick={() => {
          const newDate = new Date(currentViewMonth);
          newDate.setMonth(newDate.getMonth() - 1);
          setCurrentViewMonth(newDate);
        }}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <span className="text-gray-700">◀︎</span>
      </button>
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-bold text-gray-800">
          {format(currentViewMonth, "yyyy年")}
        </span>
        <span className="text-2xl font-bold text-blue-600">
          {format(currentViewMonth, "M月")}
        </span>
      </div>
      <button
        onClick={() => {
          const newDate = new Date(currentViewMonth);
          newDate.setMonth(newDate.getMonth() + 1);
          const today = new Date();
          if (newDate > today) return; // Don't allow future months
          setCurrentViewMonth(newDate);
        }}
        disabled={isNextMonthDisabled()}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:shadow-sm"
      >
        <span className="text-gray-700">▶︎</span>
      </button>
    </div>
  );
};
