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
    <div className="flex items-center justify-between py-2 px-4 mb-4 border-b border-theme bg-gradient-to-b from-white to-[var(--theme-color-light)] rounded-t-3xl">
      <button
        onClick={() => {
          const newDate = new Date(currentViewMonth);
          newDate.setMonth(newDate.getMonth() - 1);
          setCurrentViewMonth(newDate);
        }}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-[var(--theme-color-light)] to-[var(--theme-color-dark)] hover:opacity-75 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <span className="text-white">◀︎</span>
      </button>
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-bold text-theme-dark">
          {format(currentViewMonth, "yyyy年")}
        </span>
        <span className="text-2xl font-bold text-theme-dark">
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
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-[var(--theme-color-light)] to-[var(--theme-color-dark)] hover:opacity-75 shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:shadow-sm"
      >
        <span className="text-white">▶︎</span>
      </button>
    </div>
  );
};
