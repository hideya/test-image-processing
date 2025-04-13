import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient, getAuthToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCw, RotateCcw, AlertCircle } from "lucide-react";
import { IconPicker } from "@/components/icon-picker";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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

interface UploadResponse {
  success: boolean;
  measurement: {
    id: number;
    angle: number;
    angle2: number;
    date: string;
  };
  image: {
    id: number;
    hashKey: string;
  };
  processedImage: {
    base64: string;
    mimeType: string;
  };
}

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showDateConflictConfirmation, setShowDateConflictConfirmation] =
    useState(false);
  const [processedFileToUpload, setProcessedFileToUpload] =
    useState<File | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [selectedIcons, setSelectedIcons] = useState<number[]>([]);
  const [customDate, setCustomDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  });
  
  // State for processed image and results
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [processedAngles, setProcessedAngles] = useState<{
    angle: number;
    angle2: number;
  } | null>(null);

  // Upload mutation with updated implementation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const dateForServer = new Date(customDate);
      dateForServer.setHours(12, 0, 0, 0);
      formData.append("customDate", dateForServer.toISOString());
      // No need to send rotation value since we apply it client-side
      // Only sending for logging/debugging purposes
      formData.append("clientRotation", previewRotation.toString());

      if (memo) {
        formData.append("memo", memo);
      }

      if (selectedIcons.length > 0) {
        formData.append("iconIds", selectedIcons.join(","));
      }

      // Add authorization header for JWT authentication
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('*** Adding Authorization token to upload request');
      } else {
        console.log('*** WARNING: No token available for upload request');
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
      // Display success message
      toast({
        title: "Image uploaded and processed",
        description: "Your image has been analyzed successfully.",
        variant: "success",
      });

      // Update state with the processed image and angle data
      setProcessedAngles({
        angle: data.measurement.angle,
        angle2: data.measurement.angle2,
      });

      // Create URL from base64 data
      const processedImageSrc = `data:${data.processedImage.mimeType};base64,${data.processedImage.base64}`;
      setProcessedImageUrl(processedImageSrc);

      // Invalidate angle data cache for the charts
      queryClient.invalidateQueries({ queryKey: ["/api/angle-data"] });
      
      // Reset form state except for the results
      setSelectedFile(null);
      setPreviewUrl(null);
      setPreviewRotation(0);
      setMemo("");
      setSelectedIcons([]);
      setIsUploading(false);
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
      setSelectedIcons([]);
      setMemo("");

      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result as string);
      };
      fileReader.readAsDataURL(file);
      
      // Clear previous processed results when a new file is selected
      setProcessedImageUrl(null);
      setProcessedAngles(null);
    }
  };

  const processImageBeforeUpload = async (
    file: File,
    rotation: number = 0,
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const aspectRatio = width / height;

        if (width < height) {
          width = 1024;
          height = width / aspectRatio;
        } else {
          height = 1024;
          width = height * aspectRatio;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        if (rotation !== 0) {
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
          ctx.restore();
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to convert canvas to blob"));
              return;
            }
            const processedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"),
              { type: "image/jpeg" },
            );
            resolve(processedFile);
          },
          "image/jpeg",
          0.85,
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Check if a date already has a measurement
  const checkDateConflict = async (dateToCheck: Date): Promise<boolean> => {
    const formattedDate = dateToCheck.toISOString().split("T")[0];
    try {
      // Add token to the request
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('*** Adding Authorization token to checkDateConflict request');
      } else {
        console.log('*** WARNING: No token available for checkDateConflict request');
      }
      
      // Get angle data for checking conflicts
      const response = await fetch("/api/angle-data", { headers });
      if (!response.ok) return false;
      const data = await response.json();

      // Check if any measurement exists for this date
      const hasConflict = data.some(
        (measurement: any) => measurement.date === formattedDate
      );

      console.log("*** Checking date conflict for:", formattedDate);
      console.log("*** Has conflict:", hasConflict);

      return hasConflict;
    } catch (error) {
      console.error("*** Error checking date conflict:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      setIsUploading(true);

      try {
        const processedFile = await processImageBeforeUpload(
          selectedFile,
          previewRotation,
        );
        const hasConflict = await checkDateConflict(customDate);

        if (hasConflict) {
          setProcessedFileToUpload(processedFile);
          setShowDateConflictConfirmation(true);
          setIsUploading(false);
          return;
        }

        uploadMutation.mutate(processedFile);
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

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewRotation(0);
    setMemo("");
    setSelectedIcons([]);
    setIsUploading(false);
    // Don't reset the processed results so they remain visible
  };

  const handleConfirmDateConflict = () => {
    if (processedFileToUpload) {
      setIsUploading(true);
      uploadMutation.mutate(processedFileToUpload, {
        onSettled: () => {
          setProcessedFileToUpload(null);
          setShowDateConflictConfirmation(false);
        },
      });
    }
  };

  // Format day of week part (e.g., "Tue") for the table view
  const formatTableDayPart = useMemo(() => {
    return (dateStr: string) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const weekDayJP = ["日", "月", "火", "水", "木", "金", "土"];
      return weekDayJP[dayOfWeek];
    };
  }, []);

  return (
    <div className="bg-neutral-50">
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-center text-lg text-left rounded-full font-normal ${!customDate && "text-gray-400"}`}
                  >
                    {customDate
                      ? format(customDate, "yyyy年 M月 d日")
                      : "Select date (defaults to today)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={(date) => {
                      if (date) {
                        const newDate = new Date(date);
                        newDate.setHours(12, 0, 0, 0);
                        setCustomDate(newDate);
                        setPopoverOpen(false);
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="flex items-center justify-center pt-2">
                <input
                  type="file"
                  id="file-upload"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <label
                    htmlFor="file-upload"
                    className="py-2 w-full justify-center  border rounded-full shadow-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer inline-flex items-center"
                  >
                    <span className="truncate">
                      {selectedFile.name}
                    </span>
                  </label>
                ) : (
                  <label
                    htmlFor="file-upload"
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Select Photo
                  </label>
                )}
              </div>

              {previewUrl && (
                <div className="flex items-center justify-center pt-4">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-[50vh] object-contain rounded-md"
                      style={{
                        transform: `rotate(${previewRotation}deg)`,
                        transition: "transform 0.3s ease",
                      }}
                    />
                    <div className="absolute top-2 left-2 flex space-x-2">
                      <button
                        type="button"
                        className="p-1 bg-white/80 rounded-full hover:bg-white/90 focus:outline-none"
                        onClick={() =>
                          setPreviewRotation((prev) => (prev - 90) % 360)
                        }
                      >
                        <RotateCcw className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        className="p-1 bg-white/80 rounded-full hover:bg-white/90 focus:outline-none"
                        onClick={() =>
                          setPreviewRotation((prev) => (prev + 90) % 360)
                        }
                      >
                        <RotateCw className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="space-y-2">
                <IconPicker
                  selectedIcons={selectedIcons}
                  onChange={setSelectedIcons}
                  maxSelection={3}
                />
              </div>
            )}

            {selectedFile && (
              <div className="space-y-2">
                <input
                  type="text"
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault(); // Prevent form submission
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Memo..."
                  maxLength={100}
                />
              </div>
            )}

            {selectedFile && (
              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading & Processing...
                  </span>
                ) : (
                  "Upload and Analyze"
                )}
              </button>
            )}

            {/* Show processed image results */}
            {processedImageUrl && processedAngles && !selectedFile && (
              <div className="mt-6 border p-4 rounded-lg">
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Processed Image</h3>
                  <div className="relative h-[50vh] rounded-md overflow-hidden">
                    <img
                      src={processedImageUrl}
                      alt="Processed image"
                      className="object-contain h-full w-full"
                    />
                  </div>
                  <div className="flex mt-4 text-sm text-gray-600 gap-4">
                    <div>
                      左 {processedAngles.angle.toFixed(2)}°
                    </div>
                    <div>
                      右 {processedAngles.angle2.toFixed(2)}°
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

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
              <strong>{format(customDate, "yyyy年 M月 d日")}</strong>. Uploading
              this new image will replace the existing measurement for this
              date. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDateConflictConfirmation(false);
                setProcessedFileToUpload(null);
                setIsUploading(false);
              }}
            >
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
    </div>
  );
}
