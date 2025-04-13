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
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <button
        onClick={() => {
          const newDate = new Date(currentViewMonth);
          newDate.setMonth(newDate.getMonth() - 1);
          setCurrentViewMonth(newDate);
        }}
        className="group relative flex justify-center py-2 px-3 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        ◀︎
      </button>
      <span className="text-lg font-medium">
        {format(currentViewMonth, "yyyy年 M月")}
      </span>
      <button
        onClick={() => {
          const newDate = new Date(currentViewMonth);
          newDate.setMonth(newDate.getMonth() + 1);
          const today = new Date();
          if (newDate > today) return; // Don't allow future months
          setCurrentViewMonth(newDate);
        }}
        className="group relative flex justify-center py-2 px-3 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        ▶︎
      </button>
    </div>
  );
};
