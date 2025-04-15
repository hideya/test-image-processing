import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MeasurementDeletionProvider } from "@/context/measurement-deletion-context";
import { useAuth } from "../hooks/use-auth";
import { queryClient, apiRequest, getAuthToken } from "../lib/queryClient";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { useLoadingState } from "@/hooks/use-loading-state";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Settings, Upload, Plus } from "lucide-react";
import {
  TodaySummary,
  MonthNavigation,
  MeasurementChart,
  MeasurementTable
} from "@/components/main-page";
import { UploadSheet } from "@/components/upload-sheet";
import { SettingsSheet } from "@/components/settings-sheet";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { BaseMeasurement, UploadResponse } from "@/types/measurements";



export default function MainPage() {
  const { user, logoutMutation } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const deletionPerformedRef = useRef(false);

  // For highlighting a dot in the chart with a pulse animation
  const [pulsingDot, setPulsingDot] = useState<string | null>(null);

  // Get today's date in the same format as measurements' date - MOVED UP TO FIX THE REFERENCE ERROR
  const today = useMemo(() => {
    const day = new Date();
    day.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    return day;
  }, []);
  
  const todayDate = useMemo(() => {
    return today.toISOString().split("T")[0];
  }, [today]);

  // Initialize customDate with today's date set to noon to avoid timezone issues
  const [customDate, setCustomDate] = useState<Date>(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    return date;
  });

  // Current month to show in chart/table
  const [currentViewMonth, setCurrentViewMonth] = useState<Date>(() => {
    const date = new Date();
    date.setDate(1); // Set to first of month
    date.setHours(12, 0, 0, 0);
    return date;
  });

  // State to store the initial today measurement (won't change when navigating months)
  const [cachedTodayMeasurement, setCachedTodayMeasurement] = useState<BaseMeasurement | undefined>(undefined);

  // Fetch today's measurement data - independent of month navigation
  const {
    data: todayData = [],
    isLoading: isTodayLoading,
    refetch: refetchTodayData
  } = useQuery<BaseMeasurement[]>({
    queryKey: ["/api/angle-data", "today", todayDate],
    queryFn: async () => {
      console.log('Fetching today data for:', todayDate);
      const res = await apiRequest('GET', `/api/angle-data?start=${todayDate}&end=${todayDate}`);
      const data = await res.json();
      console.log('Today API response:', data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
  });

  // Fetch monthly angle measurements - changes when month changes
  const {
    data: monthData = [],
    isLoading: isMonthLoading,
    refetch: refetchMonthData,
  } = useQuery<BaseMeasurement[]>({
    queryKey: ["/api/angle-data", "month", currentViewMonth.toISOString()],
    queryFn: async () => {
      // Get first and last day of the month
      const year = currentViewMonth.getFullYear();
      const month = currentViewMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Convert to ISO strings for the API
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      console.log(`Fetching month data from ${startDate} to ${endDate}`);
      const res = await apiRequest('GET', `/api/angle-data?start=${startDate}&end=${endDate}`);
      const data = await res.json();
      console.log('Month API response (first 2 items):', data.slice(0, 2));
      return data;
    },
  });
  
  // Get today's measurement from the today data query
  const todayMeasurement = useMemo(() => {
    // If deletion was performed and todayData is empty, don't use cached data
    if (deletionPerformedRef.current && todayData.length === 0) {
      return undefined;
    }
    
    // Use the cached data if it exists
    if (cachedTodayMeasurement) {
      return cachedTodayMeasurement; 
    }
    
    // Primary source: Check if we have data in todayData
    if (todayData.length > 0) {
      return todayData[0];
    }
    
    // Fallback source: Check if there's matching data in monthData
    const todayInMonthData = monthData.find(item => item.date === todayDate);
    
    return todayInMonthData;
  }, [todayData, monthData, todayDate, cachedTodayMeasurement, deletionPerformedRef.current]);
  
  // Update cached measurement when data first loads (only if we don't already have a cached value)
  useEffect(() => {
    // Only cache the measurement if:
    // 1. We don't already have a cached value 
    // 2. We have a valid measurement to cache
    // 3. No deletion was performed
    if (!cachedTodayMeasurement && todayMeasurement && !deletionPerformedRef.current) {
      console.log('Caching today measurement:', todayMeasurement);
      setCachedTodayMeasurement(todayMeasurement);
    }
  }, [todayMeasurement, cachedTodayMeasurement]);

  // Clear cached measurement when today's data is empty (likely after deletion)
  useEffect(() => {
    // Only clear if:
    // 1. We currently have a cached value
    // 2. The today's data is empty (after a successful deletion)
    // 3. A deletion was performed
    if (cachedTodayMeasurement && todayData.length === 0 && deletionPerformedRef.current) {
      console.log('Today data is empty after deletion, clearing cached measurement');
      setCachedTodayMeasurement(undefined);
      // Reset the deletion flag after handling
      deletionPerformedRef.current = false;
    }
  }, [todayData, cachedTodayMeasurement]);
  
  // Combine month data and today's data for display
  const measurements = useMemo(() => {
    // Create a map of all month data for easy lookup
    const dataMap = new Map(monthData.map(item => [item.date, item]));
    
    // Add today's data if it exists and isn't already in the month data
    if (todayData.length > 0 && !dataMap.has(todayDate)) {
      dataMap.set(todayDate, todayData[0]);
    }
    console.log("******", todayDate, todayData.length, todayData[0]);
    // Convert back to array
    return Array.from(dataMap.values());
  }, [monthData, todayData, todayDate]);
  
  // Combined loading state
  const isLoading = isMonthLoading;

  // Track if this is the first load of the page
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Get unified loading state with minimum display time to avoid flicker
  // Only use this for initial page load
  const { showLoading: showInitialLoading } = useLoadingState({
    minimumLoadingTime: 1000, // Show loading for at least 1 second to avoid jarring transitions
    queryKeys: ["/api/angle-data/month", "/api/angle-data/today"], // Track both data loading states
    forceInitialLoading: true, // Always show splash screen on initial load
  });
  
  // Combine loading states to only show splash on first load
  const showSplashScreen = showInitialLoading && isFirstLoad;
  
  // After data loads for the first time, mark first load as complete
  useEffect(() => {
    if (!isMonthLoading && !isTodayLoading && isFirstLoad) {
      setIsFirstLoad(false);
    }
  }, [isMonthLoading, isTodayLoading, isFirstLoad]);
  
  // Clear pulsing effect after animation completes
  useEffect(() => {
    if (pulsingDot) {
      const timer = setTimeout(() => {
        setPulsingDot(null);
      }, 500); // Match the animation duration (500ms)
      return () => clearTimeout(timer);
    }
  }, [pulsingDot]);

  // Format for the table view (M/D DDD) - without leading zeros and day of week
  // Format date part (e.g., "8") for the table view
  const formatTableDatePart = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      return format(date, "d");
    };
  }, []);

  // Format day of week part (e.g., "火") for the table view
  const formatTableDayPart = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const weekDayJP = ["日", "月", "火", "水", "木", "金", "土"];
      return weekDayJP[dayOfWeek];
    };
  }, []);

  // Check if a date is Sunday
  const isSunday = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      return date.getDay() === 0; // 0 is Sunday in JavaScript
    };
  }, []);

  // Check if a date is Saturday
  const isSaturday = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      return date.getDay() === 6; // 6 is Saturday in JavaScript
    };
  }, []);

  // Create a simplified date formatter for the chart that shows day/month without leading zeros
  const formatSimpleDate = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      return `${format(date, "d")}`;
    };
  }, []);

  // Function to get all dates in specified month
  const getAllDatesInMonth = () => {
    const year = currentViewMonth.getFullYear();
    const month = currentViewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    firstDay.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    const lastDay = new Date(year, month + 1, 0);
    lastDay.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

    const dates = [];
    const currentDate = new Date(firstDay);

    while (currentDate <= lastDay) {
      dates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  // Sort measurements by date (newest first) to find the latest measurement
  const sortedMeasurements = useMemo(() => {
    // Get all dates in current month
    const allDates = getAllDatesInMonth();
    const measurementsByDate = new Map(measurements.map((m) => [m.date, m]));

    // Create array with all dates, using measurement data when available
    const allMeasurements = allDates.map((date) => {
      return (
        measurementsByDate.get(date) || {
          date,
          angle: undefined,
          angle2: undefined,
          imageId: undefined,
          hashKey: undefined,
          memo: undefined,
          iconIds: undefined,
        }
      );
    });

    return allMeasurements.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [measurements]);

  // Function to handle when a measurement is deleted
  const handleMeasurementDeleted = useCallback((measurementId: number, date: string) => {
    console.log(`Measurement deleted: ID ${measurementId}, date ${date}`);
    
    // If today's measurement was deleted, we need to clear the cached value
    if (date === todayDate) {
      console.log('Today\'s measurement was deleted');
      
      // Set the deletion flag to true
      deletionPerformedRef.current = true;
      
      // Force clear the cache
      setCachedTodayMeasurement(undefined);
      
      // Immediately invalidate the cache
      queryClient.invalidateQueries({ queryKey: ["/api/angle-data", "today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/angle-data", "month"] });
      
      // Force refresh today's data
      setTimeout(() => {
        refetchTodayData();
        refetchMonthData();
      }, 100);
    } else {
      // Always refresh month data for non-today measurements
      refetchMonthData();
    }
  }, [todayDate, refetchTodayData, refetchMonthData, queryClient]);

  const { chartDateRange, chartData } = useMemo(() => {
    // Get all dates in current month
    const allDates = getAllDatesInMonth();
    if (!allDates.length) return { chartDateRange: [], chartData: [] };

    // Create start and end dates from the month range
    const startDate = new Date(allDates[0]);
    const endDate = new Date(allDates[allDates.length - 1]);

    // Create a map of measurements by date for quick lookup
    const measurementsByDate = new Map();
    measurements.forEach((measurement) => {
      measurementsByDate.set(measurement.date, measurement);
    });

    // Create array of all dates in the range for x-axis labels AND chart data
    const dateRange = [];
    const allDatesData = []; // We'll use this for actual chart rendering
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split("T")[0];
      dateRange.push(dateString);

      // Add a data point for each date in the range
      // If we have data for this date, use it; otherwise just include the date for the x-axis
      if (measurementsByDate.has(dateString)) {
        // For dates with measurements, use the actual data
        allDatesData.push(measurementsByDate.get(dateString));
      } else {
        // For dates without measurements, add the date but no angle value
        // This creates a "break" in the line chart
        allDatesData.push({ date: dateString });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add padding dates on both sides by adding dummy entries with no data
    // For the day before the first date
    const firstDate = new Date(startDate);
    firstDate.setDate(firstDate.getDate() - 1);
    const beforeDate = firstDate.toISOString().split("T")[0];

    // For the day after the last date
    const lastDate = new Date(endDate);
    lastDate.setDate(lastDate.getDate() + 1);
    const afterDate = lastDate.toISOString().split("T")[0];

    // Add the padding dates to the date range and chart data
    const extendedDateRange = [beforeDate, ...dateRange, afterDate];
    const extendedChartData = [
      { date: beforeDate }, // Padding date before first real date
      ...allDatesData,
      { date: afterDate }, // Padding date after last real date
    ];

    return {
      chartDateRange: extendedDateRange,
      chartData: extendedChartData, // Use the complete date range data with padding and gaps for the chart
    };
  }, [measurements]);

  const handleUploadComplete = () => {
    toast({
      title: "Upload Complete",
      description: "Your image has been processed and saved.",
      variant: "success",
    });
    // Refresh both data sources
    refetchMonthData(); 
    refetchTodayData();
    
    // Reset the deletion flag since we're uploading new data
    deletionPerformedRef.current = false;
  };

  return (
    <MeasurementDeletionProvider onMeasurementDeleted={handleMeasurementDeleted}>
      <div className="bg-transparent min-h-screen">
        {/* Global Loading Screen - only shown on initial page load */}
        <LoadingScreen show={showSplashScreen} text="Loading your measurements" />
        
        {/* Only hide UI elements during initial load */}
        {!showSplashScreen && (
          <>
            {/* Custom buttons for both upload and settings - matching styles */}
            {/* Fixed Upload Button (Center Bottom) */}
            <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center">
              <div className="relative inline-block group">
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white text-theme-dark px-3 py-1 rounded-full text-xs font-medium shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">Upload</div>
                <UploadSheet onComplete={handleUploadComplete}>
                  <button
                    aria-label="Upload new image"
                    className="flex items-center justify-center w-14 h-14 bg-gradient-to-b from-[var(--theme-color-light)] to-[var(--theme-color-dark)] hover:opacity-75 text-white rounded-full shadow-xl transition-all duration-200 hover:shadow-2xl transform hover:-translate-y-1">
                    <Plus className="w-6 h-6" />
                  </button>
                </UploadSheet>
              </div>
            </div>

            {/* Fixed Settings Button (Bottom Right) */}
            <div className="fixed bottom-4 right-8 z-50">
              <div className="relative inline-block group">
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white text-theme-dark px-3 py-1 rounded-full text-xs font-medium shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">Settings</div>
                <SettingsSheet>
                  <button
                    aria-label="Open settings"
                    className="flex items-center justify-center w-14 h-14 bg-gradient-to-b from-[var(--theme-color-light)] to-[var(--theme-color-dark)] hover:opacity-75 text-white rounded-full shadow-xl transition-all duration-200 hover:shadow-2xl transform hover:-translate-y-1">
                    <Settings className="w-6 h-6" />
                  </button>
                </SettingsSheet>
              </div>
            </div>

            <div className="max-w-6xl mx-auto pb-20"> {/* Increased padding bottom for floating buttons */}
              <div className="grid grid-cols-1 gap-2">
                <TodaySummary
                  today={today}
                  todayMeasurement={todayMeasurement}
                  isLoading={isTodayLoading}
                  formatTableDayPart={formatTableDayPart}
                />
                
                <div className="bg-white p-0 rounded-xl shadow-md">
                  <MonthNavigation
                    currentViewMonth={currentViewMonth}
                    setCurrentViewMonth={setCurrentViewMonth}
                  />
                  {isLoading ? (
                    <div className="py-10 flex justify-center">
                      <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 rounded-full border-4 border-theme border-t-transparent animate-spin"></div>
                        <p className="text-sm text-theme-dark">
                          Loading measurement data for {format(currentViewMonth, 'MMMM yyyy')}...
                        </p>
                      </div>
                    </div>
                  ) : measurements.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-theme-dark">
                        No measurement data available yet.
                      </p>
                      <p className="text-theme-dark text-sm mt-1">
                        Upload an image to see results.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Section Title */}
                      {/* <div className="mb-4 px-4">
                        <h2 className="text-xl font-bold text-gray-800">Measurement History</h2>
                        <p className="text-gray-500 text-sm">Track your progress over time</p>
                      </div> */}
                      
                      {/* Chart view */}
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        {/* <h3 className="text-md font-medium text-gray-700 mb-3">Monthly Trend</h3> */}
                        <MeasurementChart
                          chartData={chartData}
                          chartDateRange={chartDateRange}
                          selectedDate={selectedDate}
                          setSelectedDate={setSelectedDate}
                          pulsingDot={pulsingDot}
                          setPulsingDot={setPulsingDot}
                          formatSimpleDate={formatSimpleDate}
                          isSunday={isSunday}
                          isSaturday={isSaturday}
                        />
                      </div>

                      {/* Data Table */}
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        {/* <h3 className="text-md font-medium text-gray-700 mb-3">Daily Records</h3> */}
                        <MeasurementTable 
                          sortedMeasurements={sortedMeasurements}
                          selectedDate={selectedDate}
                          setSelectedDate={setSelectedDate}
                          setPulsingDot={setPulsingDot}
                          isSunday={isSunday}
                          isSaturday={isSaturday}
                          formatTableDatePart={formatTableDatePart}
                          formatTableDayPart={formatTableDayPart}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MeasurementDeletionProvider>
  );
}
