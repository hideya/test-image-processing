import * as React from "react";
import { Calendar as BaseCalendar, CalendarProps } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * A themed version of the Calendar component that uses the application's theme colors.
 * This ensures consistent styling with the rest of the application.
 */
export function ThemedCalendar({
  className,
  classNames,
  ...props
}: CalendarProps) {
  return (
    <BaseCalendar
      className={className}
      {...props}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-theme-dark font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-theme-dark"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-theme rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-theme-light/50 [&:has([aria-selected])]:bg-theme-light first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-theme-dark aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-theme text-white hover:bg-theme-dark hover:text-white focus:bg-theme focus:text-white",
        day_today: "bg-theme-light text-theme-dark font-bold",
        day_outside:
          "day-outside text-theme-light opacity-50 aria-selected:bg-theme-light/50 aria-selected:text-theme-light aria-selected:opacity-30",
        day_disabled: "text-theme-light opacity-50",
        day_range_middle:
          "aria-selected:bg-theme-light aria-selected:text-theme-dark",
        day_hidden: "invisible",
        ...classNames,
      }}
    />
  );
}
