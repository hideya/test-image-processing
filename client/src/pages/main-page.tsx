import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useSettings, formatDate } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { IconDisplay } from "@/components/icon-picker";
import { format } from "date-fns";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Measurement {
  date: string;
  angle: number;
  angle2: number;
  imageId: number;
  hashKey: string;
  thumbnailBase64?: string;
  memo?: string;
  iconIds?: string;
}

interface UploadResponse {
  id: number;
  hashKey: string;
  thumbnailBase64?: string;
  angle: number;
  angle2: number;
  message: string;
}

export default function MainPage() {
  const { user, logoutMutation } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [setPreviewUrl] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const [setIsUploading] = useState(false);
  const [setProcessingImage] = useState<string | null>(null);
  const [setLastUploadedImage] = useState<string | null>(null);
  const [setLoadingThumbnails] = useState<{
    [key: string]: boolean;
  }>({});
  const [setExpandedThumbnail] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Track which thumbnails have been loaded at least once
  const [loadedThumbnails, setLoadedThumbnails] = useState<{
    [key: string]: boolean;
  }>({});
  // Track thumbnail base64 data for each image
  const [thumbnailCache, setThumbnailCache] = useState<{
    [key: string]: string;
  }>({});

  // Track medium-sized image URLs to avoid redundant fetches
  const [mediumImageCache, setMediumImageCache] = useState<{
    [key: string]: string;
  }>({});

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

  // Using the date formatting function from use-settings with user's preferences

  // Create a memoized formatter function that will update when settings change
  // Create a ref to store the timeout ID
  const loadingTimeoutRef = useRef<number | null>(null);

  // Cleanup the timeout when component unmounts
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Format for the table view (M/D DDD) - without leading zeros and day of week
  // Format date part (e.g., "4/8") for the table view
  const formatTableDatePart = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      // return format(date, "M/d");
      return format(date, "d");
    };
  }, []);

  // Format day of week part (e.g., "Tue") for the table view
  const formatTableDayPart = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      // return format(date, "EEE");
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

  // Format year part (e.g., "2025") for the table view
  const formatTableYearPart = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      return format(date, "yyyy");
    };
  }, []);

  // For backward compatibility with other parts of the code
  const formatTableDate = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      return `${format(date, "M/d")} ${format(date, "EEE")}`;
    };
  }, []);

  // Format for the expanded image view - day/month without leading zeros
  const formatExpandedDate = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      return format(date, "yyyy/M/d");
    };
  }, []);

  // Format using user's settings for other places
  const formatDateWithSettings = useMemo(() => {
    return (date: string | Date) => formatDate(date, settings);
  }, [settings]);

  // Create a simplified date formatter for the chart that shows day/month without leading zeros
  const formatSimpleDate = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      // return `${format(date, "M/d")}`;
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

      const res = await fetch(
        `/api/angle-data?start=${firstDay.toISOString()}&end=${lastDay.toISOString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch measurements");
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
  today.setHours(12, 0, 0, 0); // FIXME: dealing with timezone
  const todayDate = today.toISOString().split("T")[0];
  // Find today's measurement
  const todayMeasurement = measurements.find(
    (measurement) => measurement.date === todayDate,
  );
  console.log('***', todayDate, todayMeasurement)

  // Get the most recent measurement for the "Latest Measurement" display
  const latestMeasurement = useMemo(() => {
    return sortedMeasurements.length > 0 ? sortedMeasurements[0] : null;
  }, [sortedMeasurements]);

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

  // Store thumbnails in cache when they arrive from the server
  useEffect(() => {
    const newThumbnails: { [key: string]: string } = {};
    let hasNewThumbnails = false;

    measurements.forEach((measurement) => {
      if (measurement.thumbnailBase64 && !thumbnailCache[measurement.hashKey]) {
        newThumbnails[measurement.hashKey] = measurement.thumbnailBase64;
        hasNewThumbnails = true;

        // Also mark thumbnail as loaded
        setLoadedThumbnails((prev) => ({
          ...prev,
          [measurement.hashKey]: true,
        }));
      }
    });

    if (hasNewThumbnails) {
      setThumbnailCache((prev) => ({
        ...prev,
        ...newThumbnails,
      }));
    }
  }, [measurements, thumbnailCache]);

  // No need for a separate sortedMeasurements variable as we have chartData now

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

      const response = await fetch("/api/images/upload", {
        method: "POST",
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

      // Preload medium image for the processed image display
      const mediumImg = new Image();
      mediumImg.onload = () => {
        setMediumImageCache((prev) => ({
          ...prev,
          [data.hashKey]: `/api/images/${data.hashKey}/medium`,
        }));
      };
      mediumImg.src = `/api/images/${data.hashKey}/medium`;

      // If we have a thumbnailBase64 from the server, use it directly
      if (data.thumbnailBase64) {
        // Store in thumbnail cache
        setThumbnailCache((prev) => ({
          ...prev,
          [data.hashKey]: data.thumbnailBase64!,
        }));
        // Mark as loaded and not loading
        setLoadedThumbnails((prev) => ({
          ...prev,
          [data.hashKey]: true,
        }));
        setLoadingThumbnails((prev) => ({
          ...prev,
          [data.hashKey]: false,
        }));
      }
      // Otherwise download the server-processed image for thumbnail display
      else if (data.hashKey) {
        // Start loading the server-processed image
        setLoadingThumbnails((prev) => ({
          ...prev,
          [data.hashKey]: true,
        }));

        // Fetch the image from the server
        const img = new Image();
        img.onload = () => {
          // Mark as loaded and not loading
          setLoadedThumbnails((prev) => ({
            ...prev,
            [data.hashKey]: true,
          }));
          setLoadingThumbnails((prev) => ({
            ...prev,
            [data.hashKey]: false,
          }));
        };
        img.onerror = () => {
          // Mark as not loading on error
          setLoadingThumbnails((prev) => ({
            ...prev,
            [data.hashKey]: false,
          }));
        };
        // Add timestamp to prevent caching issues
        const thumbnailUrl = `/api/images/${data.hashKey}`;
        img.src = thumbnailUrl;
      }

      // Poll for results
      const checkInterval = setInterval(async () => {
        try {
          const response = await fetch("/api/latest-angle");
          if (response.ok) {
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

    // Log for debugging
    console.log("Checking date conflict for:", formattedDate);
    console.log(
      "Available measurement dates:",
      measurements.map((m) => m.date),
    );

    // Check if any measurement has this date
    const hasConflict = measurements.some(
      (measurement) => measurement.date === formattedDate,
    );
    console.log("Has conflict:", hasConflict);

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

  // Handle cancellation of overwrite
  const handleCancelDateConflict = () => {
    setShowDateConflictConfirmation(false);
    setProcessedFileToUpload(null);
    setIsUploading(false);
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
      <AlertDialog
        open={showDateConflictConfirmation}
        onOpenChange={setShowDateConflictConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Replace Existing Measurement?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You already have a measurement for{" "}
              <strong>{getFormattedDateForDialog()}</strong>. Uploading this new
              image will replace the existing measurement for this date. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDateConflict}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDateConflict}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Yes, Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-4 rounded-lg shadow-sm">
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
              <Link href="/upload">
                <div className="bg-blue-50 p-4 rounded-full">
                  <div className="flex items-center justify-center">
                    <div className="flex flex-end">
                      <div className="font-medium text-blue-800 mr-2 mt-2">
                        {format(new Date(today), "yyyy年")}
                      </div>
                      <div className="text-xl font-medium text-blue-800 mr-2 mt-1">
                        {format(new Date(today), "M月 d日")}
                      </div>
                      <div className="font-medium text-blue-800 mt-1.5">
                        ({formatTableDayPart(today)})
                      </div>
                    </div>
                    {todayMeasurement ? (
                      <>
                        <div className="flex">
                          <div className="text-sm font-medium text-blue-600 ml-4 mr-2 mt-2">
                            左足
                          </div>
                          <div className="text-2xl font-semibold text-blue-800">
                            {todayMeasurement.angle !== undefined
                              ? todayMeasurement.angle.toFixed(1)
                              : "--"}
                            °
                          </div>
                        </div>
                        <div className="flex">
                          <div className="text-sm font-medium text-green-600 mx-2 mt-2">
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

              {/* Month Navigation */}
              <div className="flex items-center justify-center gap-4 py-2">
                <button
                  onClick={() => {
                    const newDate = new Date(currentViewMonth);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentViewMonth(newDate);
                  }}
                  className="group relative flex justify-center py-2 px-3 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  // className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  ◀︎
                </button>
                <span className="text-lg font-medium">
                  {format(currentViewMonth, "yyyy/M")}
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

              {/* Chart view */}
              <div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData} // Use chart data with actual measurements
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      {/*  */}
                      <ReferenceArea
                        y1={40}
                        y2={50}
                        fill="#FFEBEE" /* red */
                        fillOpacity={0.75}
                      />
                      {/*  */}
                      <ReferenceArea
                        y1={20}
                        y2={40}
                        fill="#FFF3E0"
                        fillOpacity={0.75} /* orange */
                      />
                      {/*  */}
                      <ReferenceArea
                        y1={15}
                        y2={20}
                        fill="#FFFFE0" /* yellow */
                        fillOpacity={0.75}
                      />
                      {/*  */}
                      <ReferenceArea
                        y1={0}
                        y2={15}
                        fill="#E8F5E9" /* green */
                        fillOpacity={0.75}
                      />

                      {/*  */}
                      <ReferenceArea
                        y1={40}
                        y2={40}
                        fill="#FFEBEE"
                        fillOpacity={0}
                        label={{
                          value: "40°",
                          position: "insideLeft",
                          fontSize: 12,
                          offset: 4,
                          fill: "#E02020",
                        }}
                      />
                      {/*  */}
                      <ReferenceArea
                        y1={20}
                        y2={20}
                        fillOpacity={0}
                        label={{
                          value: "20°",
                          position: "insideLeft",
                          fontSize: 12,
                          fill: "#E05000",
                          offset: 4,
                        }}
                      />
                      {/*  */}
                      <ReferenceArea
                        y1={15}
                        y2={15}
                        fillOpacity={0}
                        label={{
                          value: "15°",
                          position: "insideLeft",
                          fontSize: 12,
                          fill: "#008000",
                          offset: 4,
                        }}
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => formatSimpleDate(date)} // Simplified date format (MM/DD)
                        tick={(props) => {
                          const { x, y, payload } = props;
                          const isSun = isSunday(payload.value);
                          const isSat = isSaturday(payload.value);
                          let textColor = "#6b7280"; // Default gray

                          if (isSun) {
                            textColor = "#ef4444"; // Red for Sunday
                          } else if (isSat) {
                            textColor = "#3b82f6"; // Blue for Saturday
                          }

                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text
                                x={0}
                                y={0}
                                dy={16}
                                textAnchor="middle"
                                fill={textColor}
                                fontSize={12}
                              >
                                {formatSimpleDate(payload.value)}
                              </text>
                            </g>
                          );
                        }}
                        stroke="#6b7280"
                        fontSize={12}
                        // Define custom ticks - filter out the padding dates
                        ticks={chartDateRange.filter(
                          (date, index) =>
                            index !== 0 &&
                            index !== chartDateRange.length - 1,
                        )}
                        // Force showing all ticks (one per date in the range)
                        interval={0}
                        // Use type category for discrete dates
                        type="category"
                        // Add padding to ensure all labels are visible
                        padding={{ left: 0.5, right: 0.5 }}
                        // Scale to fit all dates
                        scale="point"
                      />
                      <YAxis
                        domain={[0, 50]}
                        hide={true} // Hide the axis entirely
                      />

                      {/* Legend removed as requested since colors are now consistent with table */}

                      <Line
                        type="monotone"
                        dataKey="angle"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Primary Angle"
                        isAnimationActive={false} 
                        connectNulls={true} // Connect points even when there are null values in between
                        // Use a render function for dots to handle the selected state
                        dot={(props: any) => {
                          const { cx, cy, payload, index } = props;
                          const key=`dot-${payload.date}-${index}` // Use combination of date and index
                          const datakey=`dot-${payload.date}-${index}` // Add this to help Recharts with uniqueness
                          // Don't render anything for data points without angle values
                          if (payload.angle === undefined) {
                            // We need to return a valid SVG element due to TypeScript constraints,
                            // so return an invisible circle instead of null
                            return (
                              <circle
                                key={key}
                                data-key={datakey}
                                cx={cx}
                                cy={cy}
                                r={0}
                                fill="transparent"
                                stroke="none"
                              />
                            );
                          }

                          // Check if this dot corresponds to the selected date
                          const isSelected = selectedDate === payload.date;
                          // Check if this dot is currently pulsing
                          const isPulsing = pulsingDot === payload.date;

                          return (
                            <circle
                              key={key}
                              data-key={datakey}
                              cx={cx}
                              cy={cy}
                              r={isPulsing ? 20 : isSelected ? 6 : 4}
                              fill={isSelected ? "#2563eb" : "#3b82f6"}
                              stroke={
                                isSelected || isPulsing ? "#fff" : "none"
                              }
                              strokeWidth={isSelected || isPulsing ? 2 : 0}
                              onClick={() => {
                                if (payload && payload.angle !== undefined) {
                                  if (selectedDate === payload.date) {
                                    setSelectedDate(null);
                                    setPulsingDot(null);
                                  } else {
                                    setSelectedDate(payload.date);
                                    // Show pulse animation - animation will handle the transitions
                                    setPulsingDot(payload.date);
                                  }
                                }
                              }}
                              style={{
                                cursor: "pointer",
                                animation: isPulsing
                                  ? "pulse-dot 500ms cubic-bezier(0.2, 0, 0.35, 1) forwards"
                                  : "none",
                              }}
                            />
                          );
                        }}
                        activeDot={(props: any) => {
                          // Use a function to customize active dot behavior
                          const { cx, cy, payload, index } = props;
                          const key=`active-dot-${payload.date}-${index}`
                          const datakey=`active-dot-${payload.date}-${index}`

                          // For points without data, return an invisible circle
                          if (payload.angle === undefined) {
                            return (
                              <circle
                                key={key}
                                data-key={datakey}
                                cx={cx}
                                cy={cy}
                                r={0}
                                fill="transparent"
                                stroke="none"
                              />
                            );
                          }

                          return (
                            <circle
                              key={`active-dot-${payload.date}-${index}`}
                              data-key={`active-dot-${payload.date}-${index}`}
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="#2563eb"
                              stroke="#fff"
                              strokeWidth={2}
                              onClick={() => {
                                if (selectedDate === payload.date) {
                                  setSelectedDate(null);
                                } else {
                                  setSelectedDate(payload.date);
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            />
                          );
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="angle2"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Secondary Angle"
                        isAnimationActive={false} 
                        connectNulls={true}
                        dot={(props: any) => {
                          const { cx, cy, payload, index } = props;
                          const key=`active-dot2-${payload.date}-${index}`
                          const datakey=`active-dot2-${payload.date}-${index}`

                          // Don't render anything for data points without angle2 values
                          if (payload.angle2 === undefined) {
                            return (
                              <circle
                                key={key}
                                data-key={datakey}
                                cx={cx}
                                cy={cy}
                                r={0}
                                fill="transparent"
                                stroke="none"
                              />
                            );
                          }

                          // Check if this dot corresponds to the selected date
                          const isSelected = selectedDate === payload.date;
                          // Check if this dot is currently pulsing
                          const isPulsing = pulsingDot === payload.date;

                          return (
                            <circle
                              key={key}
                              data-key={datakey}
                              cx={cx}
                              cy={cy}
                              r={isPulsing ? 20 : isSelected ? 6 : 4}
                              fill={isSelected ? "#059669" : "#10b981"}
                              stroke={
                                isSelected || isPulsing ? "#fff" : "none"
                              }
                              strokeWidth={isSelected || isPulsing ? 2 : 0}
                              onClick={() => {
                                if (payload && payload.angle2 !== undefined) {
                                  if (selectedDate === payload.date) {
                                    setSelectedDate(null);
                                    setPulsingDot(null);
                                  } else {
                                    setSelectedDate(payload.date);
                                    setPulsingDot(payload.date);
                                  }
                                }
                              }}
                              style={{
                                cursor: "pointer",
                                animation: isPulsing
                                  ? "pulse-dot 500ms cubic-bezier(0.2, 0, 0.35, 1) forwards"
                                  : "none",
                              }}
                            />
                          );
                        }}
                        activeDot={(props: any) => {
                          const { cx, cy, payload, index } = props;
                          const key=`active-dot2-${payload.date}-${index}`
                          const datakey=`active-dot2-${payload.date}-${index}`
                          if (payload.angle2 === undefined) {
                            return (
                              <circle
                                key={key}
                                data-key={datakey}
                                cx={cx}
                                cy={cy}
                                r={0}
                                fill="transparent"
                                stroke="none"
                              />
                            );
                          }
                          return (
                            <circle
                              key={key}
                              data-key={datakey}
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="#059669"
                              stroke="#fff"
                              strokeWidth={2}
                              onClick={() => {
                                if (selectedDate === payload.date) {
                                  setSelectedDate(null);
                                } else {
                                  setSelectedDate(payload.date);
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table */}
              <div>
                <div className="max-h-[64rem] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-10 pl-2 pr-0 py-1 text-center text-xs font-medium text-gray-500 uppercase">
                          日付
                        </th>
                        <th className="pl-2 py-1 text-center text-xs font-medium text-blue-600 uppercase">
                          左
                        </th>
                        <th className="pl-1 py-1 text-center text-xs font-medium text-emerald-600 uppercase">
                          右
                        </th>
                        <th className="px-0 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          メ モ
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
                                // Toggle selection or set new selection
                                if (selectedDate === measurement.date) {
                                  // Deselect row and close expanded image
                                  setSelectedDate(null);
                                  setPulsingDot(null);
                                } else {
                                  // Set the date as pulsing dot and animation will handle the transitions
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
                            {/* Memo is now shown inline in the row above */}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
