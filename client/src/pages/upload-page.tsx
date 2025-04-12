import React, { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
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
  id: number;
  hashKey: string;
  thumbnailBase64?: string;
  angle: number;
  angle2: number;
  message: string;
}

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [processingImage, setProcessingImage] = useState<string | null>(null);
  const [lastUploadedImage, setLastUploadedImage] = useState<string | null>(
    null,
  );
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
  const [mediumImageCache, setMediumImageCache] = useState<{
    [key: string]: string;
  }>({});

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      const dateForServer = new Date(customDate);
      dateForServer.setHours(12, 0, 0, 0);
      formData.append("customDate", dateForServer.toISOString());
      formData.append("rotation", previewRotation.toString());

      if (memo) {
        formData.append("memo", memo);
      }

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
      // Initialize angles state to null
      setProcessedAngles(null);

      const mediumImg = new Image();
      mediumImg.onload = () => {
        setMediumImageCache((prev) => ({
          ...prev,
          [data.hashKey]: `/api/images/${data.hashKey}/medium`,
        }));
      };
      mediumImg.src = `/api/images/${data.hashKey}/medium`;

      // Poll for results
      const checkInterval = setInterval(async () => {
        try {
          const response = await fetch("/api/latest-angle");
          if (response.ok) {
            const angleData = await response.json();
            if (angleData.angle !== null) {
              clearInterval(checkInterval);
              setProcessingImage(null);
              setProcessedAngles({
                angle: angleData.angle,
                angle2: angleData.angle2,
              });
              queryClient.invalidateQueries({ queryKey: ["/api/angle-data"] });
            }
          }
        } catch (error) {
          console.error("Error checking processing status:", error);
        }
      }, 2000);

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

      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result as string);
      };
      fileReader.readAsDataURL(file);
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
      // Get angle data for checking conflicts
      const response = await fetch("/api/angle-data");
      if (!response.ok) return false;
      const data = await response.json();

      // Check if any measurement exists for this date
      const hasConflict = data.some(
        (measurement: any) => measurement.date === formattedDate,
      );

      console.log("Checking date conflict for:", formattedDate);
      console.log("Has conflict:", hasConflict);

      return hasConflict;
    } catch (error) {
      console.error("Error checking date conflict:", error);
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

        uploadMutation.mutate(processedFile, {
          onSettled: () => {
            resetForm();
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

  // Add state for processed angles
  const [processedAngles, setProcessedAngles] = useState<{
    angle: number;
    angle2: number;
  } | null>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewRotation(0);
    setMemo("");
    setSelectedIcons([]);
    setIsUploading(false);
    setProcessedAngles(null);
  };

  const handleConfirmDateConflict = () => {
    if (processedFileToUpload) {
      setIsUploading(true);
      uploadMutation.mutate(processedFileToUpload, {
        onSettled: () => {
          resetForm();
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
      // return format(date, "EEE");
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
                <label
                  htmlFor="file-upload"
                  className="py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer inline-flex items-center"
                >
                  {selectedFile ? (
                    <span className="text-sm text-gray-500 truncate max-w-xs">
                      {selectedFile.name}
                    </span>
                  ) : (
                    "Select Photo"
                  )}
                </label>
              </div>

              {previewUrl && (
                <div className="flex items-center justify-center mt-2">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-48 object-contain rounded-md"
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
                <textarea
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Memo..."
                  rows={3}
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
                    Uploading...
                  </span>
                ) : (
                  "Upload and Analyze"
                )}
              </button>
            )}

            {processingImage && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-yellow-500" />
                  <p className="text-sm text-yellow-700">
                    Processing image... This may take a few moments.
                  </p>
                </div>
              </div>
            )}

            {lastUploadedImage && !selectedFile && (
              <div className="mt-6 border p-4 rounded-lg">
                <div className="flex flex-col items-center">
                  {processedAngles && <h3>Processed Image</h3>}
                  <div className="relative h-64 w-64 border rounded-md overflow-hidden">
                    {processingImage === lastUploadedImage && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Processing
                        </span>
                      </div>
                    )}

                    <img
                      src={
                        mediumImageCache[lastUploadedImage] ||
                        `/api/images/${lastUploadedImage}/medium`
                      }
                      alt="Server processed image"
                      className="object-contain h-full w-full"
                      onLoad={() => {
                        if (!mediumImageCache[lastUploadedImage]) {
                          setMediumImageCache((prev) => ({
                            ...prev,
                            [lastUploadedImage]: `/api/images/${lastUploadedImage}/medium`,
                          }));
                        }
                      }}
                    />
                  </div>
                  {processedAngles && (
                    <div className="mt-4 text-sm text-gray-600">
                      <p>
                        Primary Angle: {processedAngles.angle.toFixed(2)}°
                      </p>
                      <p>
                        Secondary Angle: {processedAngles.angle2.toFixed(2)}°
                      </p>
                    </div>
                  )}
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
