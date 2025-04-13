import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../hooks/use-auth";
import { queryClient, apiRequest, getAuthToken } from "../lib/queryClient";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  DateConflictDialog,
  TodaySummary,
  MonthNavigation,
  MeasurementChart,
  MeasurementTable
} from "@/components/main-page";

interface Measurement {
  date: string;
  angle: number;
  angle2: number;
  imageId: number;
  hashKey: string;
  memo?: string;
  iconIds?: string;
}

interface UploadResponse {
  id: number;
  hashKey: string;
  angle: number;
  angle2: number;
  message: string;
}

export default function MainPage() {
  const { user, logoutMutation } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [processingImage, setProcessingImage] = useState<string | null>(null);
  const [lastUploadedImage, setLastUploadedImage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // For highlighting a dot in the chart with a pulse animation
  const [pulsingDot, setPulsingDot] = useState<string | null>(null);

  // Clear pulsing effect after animation completes
  useEffect(() => {
    if (pulsingDot) {
      const timer = setTimeout(() => {
        setPulsingDot(null);
      }, 500); // Match the animation duration (500ms)
      return () => clearTimeout(timer);
    }
  }, [pulsingDot]);
  
  // Initialize with current date by default to avoid server/client time inconsistencies
  // Initialize customDate with today's date set to noon to avoid timezone issues
  const [customDate, setCustomDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    return today;
  });

  // Current month to show in chart/table
  const [currentViewMonth, setCurrentViewMonth] = useState<Date>(() => {
    const today = new Date();
    today.setDate(1); // Set to first of month
    today.setHours(12, 0, 0, 0);
    return today;
  });
  const [memo, setMemo] = useState("");
  const [selectedIcons, setSelectedIcons] = useState<number[]>([]);

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

  // Fetch angle measurements
  const {
    data: measurements = [],
    isLoading,
    refetch,
  } = useQuery<Measurement[]>({
    queryKey: ["/api/angle-data", currentViewMonth.toISOString()],
    queryFn: async () => {
      // Get first and last day of the month
      const year = currentViewMonth.getFullYear();
      const month = currentViewMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Use apiRequest function to ensure auth token is included
      const res = await apiRequest(
        'GET',
        `/api/angle-data?start=${firstDay.toISOString()}&end=${lastDay.toISOString()}`
      );
      return res.json();
    },
  });

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

  // Get today's date in the same format as measurements' date
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
  const todayDate = today.toISOString().split("T")[0];
  // Find today's measurement
  const todayMeasurement = measurements.find(
    (measurement) => measurement.date === todayDate,
  );

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

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      // Always send client-side date to avoid server/client time inconsistencies
      // Format date as ISO string but set time to noon to avoid timezone issues
      // This ensures the date remains the same regardless of timezone
      const dateForServer = new Date(customDate);
      dateForServer.setHours(12, 0, 0, 0);
      formData.append("customDate", dateForServer.toISOString());

      // Send rotation angle to the server so it can rotate the image accordingly
      formData.append("rotation", previewRotation.toString());

      // Send memo if provided
      if (memo) {
        formData.append("memo", memo);
      }

      // Send selected icons if any
      if (selectedIcons.length > 0) {
        formData.append("iconIds", selectedIcons.join(","));
      }

      // Use token from helper function
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('*** Adding Authorization token to upload request in main page');
      } else {
        console.log('*** WARNING: No token available for upload request in main page');
      }
      
      const response = await fetch("/api/images/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      return (await response.json()) as UploadResponse;
    },
    onSuccess: (data) => {
      toast({
        title: "Image uploaded successfully",
        description: "Your image is being processed. Results will appear soon.",
        variant: "success",
      });

      setProcessingImage(data.hashKey);
      setLastUploadedImage(data.hashKey);

      // Poll for results
      const checkInterval = setInterval(async () => {
        try {
          const response = await apiRequest('GET', "/api/latest-angle");
          clearInterval(checkInterval);
          setProcessingImage(null);

          // Get the latest measurement data and update the measurements directly
          const latestData = await response.json();
          if (latestData.angle !== null) {
            // Invalidate the query cache to force a refresh when the user returns to this page
            queryClient.invalidateQueries({ queryKey: ["/api/angle-data"] });
            // Refresh the measurements data immediately
            refetch();
          }
        } catch (error) {
          console.error("Error checking processing status:", error);
        }
      }, 2000);

      // Clear polling after 30 seconds as a safety
      setTimeout(() => {
        clearInterval(checkInterval);
        setProcessingImage(null);
      }, 30000);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Create a preview URL
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result as string);
      };
      fileReader.readAsDataURL(file);
    }
  };

  // Function to process image before upload
  const processImageBeforeUpload = async (
    file: File,
    rotation: number = 0,
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Determine new dimensions (shorter side = 1024px)
        let width = img.width;
        let height = img.height;
        const aspectRatio = width / height;

        if (width < height) {
          // Width is shorter dimension
          width = 1024;
          height = width / aspectRatio;
        } else {
          // Height is shorter dimension
          height = 1024;
          width = height * aspectRatio;
        }

        // Create canvas and context
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Apply rotation if needed
        if (rotation !== 0) {
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
          ctx.restore();
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Convert to JPEG with reduced quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to convert canvas to blob"));
              return;
            }

            // Create a new File object
            const processedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"), // Replace extension with .jpg
              { type: "image/jpeg" },
            );

            resolve(processedFile);
          },
          "image/jpeg",
          0.85, // Quality parameter (0.85 is a good balance)
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      // Load the image from the file
      img.src = URL.createObjectURL(file);
    });
  };

  // State for the date conflict confirmation dialog
  const [showDateConflictConfirmation, setShowDateConflictConfirmation] =
    useState(false);
  const [processedFileToUpload, setProcessedFileToUpload] =
    useState<File | null>(null);

  // Check if a date already has a measurement
  const checkDateConflict = (dateToCheck: Date): boolean => {
    // Format date as YYYY-MM-DD for comparison
    const formattedDate = dateToCheck.toISOString().split("T")[0];

    // Check if any measurement has this date
    const hasConflict = measurements.some(
      (measurement) => measurement.date === formattedDate,
    );

    return hasConflict;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      setIsUploading(true);

      try {
        // Process the image before upload
        const processedFile = await processImageBeforeUpload(
          selectedFile,
          previewRotation,
        );

        // Check if there's already a measurement for this date
        if (checkDateConflict(customDate)) {
          // Store the processed file and show confirmation dialog
          setProcessedFileToUpload(processedFile);
          setShowDateConflictConfirmation(true);
          setIsUploading(false);
          return;
        }

        // If no conflict, proceed with upload
        uploadMutation.mutate(processedFile, {
          onSettled: () => {
            setSelectedFile(null);
            setPreviewUrl(null);
            // Reset date to today after upload with consistent timezone handling
            const today = new Date();
            today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
            setCustomDate(today);
            setPreviewRotation(0); // Reset rotation angle
            setMemo(""); // Reset memo field
            setSelectedIcons([]); // Reset selected icons
            setIsUploading(false);
          },
        });
      } catch (error) {
        console.error("Error processing image:", error);
        setIsUploading(false);
        toast({
          title: "Image processing failed",
          description:
            "There was an error processing the image. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No file selected",
        description: "Please select an image file to upload",
        variant: "destructive",
      });
    }
  };

  // Handle confirmation of overwriting existing data
  const handleConfirmDateConflict = () => {
    if (processedFileToUpload) {
      setIsUploading(true);
      uploadMutation.mutate(processedFileToUpload, {
        onSettled: () => {
          setSelectedFile(null);
          setPreviewUrl(null);
          // Reset date to today after upload with consistent timezone handling
          const today = new Date();
          today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
          setCustomDate(today);
          setPreviewRotation(0); // Reset rotation angle
          setMemo(""); // Reset memo field
          setSelectedIcons([]); // Reset selected icons
          setProcessedFileToUpload(null);
          setShowDateConflictConfirmation(false);
          setIsUploading(false);
        },
      });
    }
  };

  // Format the date for display in the confirmation dialog
  const getFormattedDateForDialog = () => {
    const dateForDialog = new Date(customDate);
    dateForDialog.setHours(12, 0, 0, 0);
    return format(dateForDialog, "MMMM d, yyyy");
  };

  return (
    <div className="bg-neutral-50">
      {/* Date Conflict Confirmation Dialog */}
      <DateConflictDialog
        open={showDateConflictConfirmation}
        onOpenChange={setShowDateConflictConfirmation}
        formattedDate={getFormattedDateForDialog()}
        onConfirm={handleConfirmDateConflict}
        onCancel={() => {
          setShowDateConflictConfirmation(false);
          setProcessedFileToUpload(null);
          setIsUploading(false);
        }}
      />

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <TodaySummary
            today={today}
            todayMeasurement={todayMeasurement}
            formatTableDayPart={formatTableDayPart}
          />

          {/* Month Navigation */}
          <MonthNavigation
            currentViewMonth={currentViewMonth}
            setCurrentViewMonth={setCurrentViewMonth}
          />
        
          {isLoading ? (
            <div className="py-10 flex justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">
                  Loading measurement data...
                </p>
              </div>
            </div>
          ) : measurements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No measurement data available yet.
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Upload an image to see results.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chart view */}
              <div>
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
              <div>
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
  );
}
