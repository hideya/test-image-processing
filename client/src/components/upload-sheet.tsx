import React, { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient, getAuthToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCw, RotateCcw, AlertCircle, Upload } from "lucide-react";
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

// Reuse the interfaces and enums from your existing upload-page.tsx
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

// Define workflow steps
enum UploadStep {
  INITIAL = 'initial',
  UPLOADING = 'uploading',
  RESULTS = 'results',
  UPDATING = 'updating',
  COMPLETE = 'complete'
}

interface UploadSheetProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function UploadSheet({ onComplete, onCancel }: UploadSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<UploadStep>(UploadStep.INITIAL);
  const [showDateConflictConfirmation, setShowDateConflictConfirmation] =
    useState(false);
  const [processedFileToUpload, setProcessedFileToUpload] =
    useState<File | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [selectedIcons, setSelectedIcons] = useState<number[]>([]);
  const [customDate, setCustomDate] = useState<Date>(() => {
    // Create a date for today but ensure it's not in the future
    const today = new Date();
    // Set time to noon to avoid timezone issues
    today.setHours(12, 0, 0, 0);
    
    // Ensure the date is not in the future by comparing to current date
    const currentDate = new Date();
    if (today > currentDate) {
      // If somehow today is in the future (unlikely unless there are timezone issues)
      // use yesterday instead
      today.setDate(today.getDate() - 1);
    }
    return today;
  });
  
  // State for processed image and results
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [processedAngles, setProcessedAngles] = useState<{
    angle: number;
    angle2: number;
  } | null>(null);
  
  // Track the currentMeasurementId for metadata updates
  const [currentMeasurementId, setCurrentMeasurementId] = useState<number | null>(null);

  // Copy the rest of the code from upload-page.tsx including all the functions and mutations
  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      // Ensure the date is not in the future
      const dateForServer = new Date(customDate);
      dateForServer.setHours(12, 0, 0, 0);
      
      // Safety check to ensure date is not in the future
      const currentDate = new Date();
      if (dateForServer > currentDate) {
        dateForServer.setDate(dateForServer.getDate() - 1);
      }
      
      formData.append("customDate", dateForServer.toISOString());
      formData.append("clientRotation", previewRotation.toString());

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
      toast({
        title: "Image processed successfully",
        description: "You can now add notes and icons to this measurement.",
        variant: "success",
      });

      setProcessedAngles({
        angle: data.measurement.angle,
        angle2: data.measurement.angle2,
      });

      const processedImageSrc = `data:${data.processedImage.mimeType};base64,${data.processedImage.base64}`;
      setProcessedImageUrl(processedImageSrc);

      setCurrentMeasurementId(data.measurement.id);

      setCurrentStep(UploadStep.RESULTS);
      
      setSelectedFile(null);
      setPreviewUrl(null);
      setPreviewRotation(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setCurrentStep(UploadStep.INITIAL);
    },
  });

  // Metadata update mutation
  const updateMetadataMutation = useMutation({
    mutationFn: async ({ measurementId, memo, iconIds }: { measurementId: number, memo: string, iconIds: number[] }) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('*** Adding Authorization token to metadata update request');
      } else {
        console.log('*** WARNING: No token available for metadata update request');
      }
      
      const iconIdsString = iconIds.length > 0 ? iconIds.join(',') : undefined;
      
      const response = await fetch(`/api/measurements/${measurementId}/metadata`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          memo: memo || undefined,
          iconIds: iconIdsString
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update metadata");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Details saved",
        description: "Your notes and icons have been saved successfully.",
        variant: "success",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/angle-data"] });
      
      setCurrentStep(UploadStep.COMPLETE);
      
      setMemo("");
      setSelectedIcons([]);
      
      // If onComplete callback is provided, call it
      if (onComplete) {
        setTimeout(() => {
          onComplete();
          setOpen(false);
        }, 1500); // Wait for the user to see the success message
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save details",
        description: error.message,
        variant: "destructive",
      });
      setCurrentStep(UploadStep.RESULTS);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      setSelectedIcons([]);
      setMemo("");
      setCurrentMeasurementId(null);
      setCurrentStep(UploadStep.INITIAL);

      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result as string);
      };
      fileReader.readAsDataURL(file);
      
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
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('*** Adding Authorization token to checkDateConflict request');
      } else {
        console.log('*** WARNING: No token available for checkDateConflict request');
      }
      
      const response = await fetch("/api/angle-data", { headers });
      if (!response.ok) return false;
      const data = await response.json();

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

  // Handle file upload and processing
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      setCurrentStep(UploadStep.UPLOADING);

      try {
        const processedFile = await processImageBeforeUpload(
          selectedFile,
          previewRotation,
        );
        const hasConflict = await checkDateConflict(customDate);

        if (hasConflict) {
          setProcessedFileToUpload(processedFile);
          setShowDateConflictConfirmation(true);
          setCurrentStep(UploadStep.INITIAL);
          return;
        }

        uploadMutation.mutate(processedFile);
      } catch (error) {
        console.error("Error processing image:", error);
        setCurrentStep(UploadStep.INITIAL);
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

  // Submit metadata
  const handleSubmitMetadata = () => {
    if (!currentMeasurementId) {
      toast({
        title: "Error",
        description: "Missing measurement information. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStep(UploadStep.UPDATING);
    updateMetadataMutation.mutate({
      measurementId: currentMeasurementId,
      memo,
      iconIds: selectedIcons
    });
  };

  // Reset the form to start over
  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewRotation(0);
    setMemo("");
    setSelectedIcons([]);
    setProcessedImageUrl(null);
    setProcessedAngles(null);
    setCurrentMeasurementId(null);
    setCurrentStep(UploadStep.INITIAL);
    // Note: We don't reset customDate here because it's handled separately in the useEffect
  };

  const handleConfirmDateConflict = () => {
    if (processedFileToUpload) {
      setCurrentStep(UploadStep.UPLOADING);
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

  // Handle close sheet
  const handleCloseSheet = () => {
    if (currentStep !== UploadStep.UPLOADING && currentStep !== UploadStep.UPDATING) {
      resetForm();
      setOpen(false);
      if (onCancel) {
        onCancel();
      }
    }
  };
  
  // Reset state when sheet is opened
  useEffect(() => {
    if (open) {
      // Reset all form state
      resetForm();
      
      // Re-initialize the date when the sheet opens
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      setCustomDate(today);
    }
  }, [open]);

  // Render different content based on the current step
  const renderContent = () => {
    switch (currentStep) {
      case UploadStep.INITIAL:
        return (
          <form onSubmit={handleUpload} className="space-y-4">
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
                        
                        // Ensure the date is not in the future
                        const currentDate = new Date();
                        if (newDate > currentDate) {
                          toast({
                            title: "Invalid date",
                            description: "You cannot select a date in the future.",
                            variant: "destructive",
                          });
                          return;
                        }
                        
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
                  id="file-upload-sheet"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <label
                    htmlFor="file-upload-sheet"
                    className="py-2 w-full justify-center border rounded-full shadow-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer inline-flex items-center"
                  >
                    <span className="truncate">
                      {selectedFile.name}
                    </span>
                  </label>
                ) : (
                  <label
                    htmlFor="file-upload-sheet"
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
                      className="h-[40vh] object-contain rounded-md"
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
              <button
                type="submit"
                className="w-full py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload and Analyze
              </button>
            )}

            {/* Show processed image from previous uploads */}
            {processedImageUrl && processedAngles && !selectedFile && (
              <div className="mt-6 border p-4 rounded-lg">
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Previous Results</h3>
                  <div className="relative h-[40vh] rounded-md overflow-hidden">
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
        );
        
      case UploadStep.UPLOADING:
        return (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Processing your image...</h3>
            <p className="text-gray-500 mt-2">This might take a few seconds</p>
          </div>
        );
        
      case UploadStep.RESULTS:
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Image Analysis Results</h3>
              <p className="text-gray-500 mb-4">{format(customDate, "yyyy年 M月 d日")}</p>
              
              {processedImageUrl && (
                <div className="w-full max-w-md">
                  <div className="relative h-[40vh] rounded-md overflow-hidden mb-4">
                    <img
                      src={processedImageUrl}
                      alt="Processed image"
                      className="object-contain h-full w-full"
                    />
                  </div>
                  
                  {processedAngles && (
                    <div className="flex justify-between p-4 bg-gray-50 rounded-lg mb-6 text-center">
                      <div>
                        <p className="text-gray-500 text-sm">Primary Angle</p>
                        <p className="text-2xl font-bold">{processedAngles.angle.toFixed(2)}°</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Secondary Angle</p>
                        <p className="text-2xl font-bold">{processedAngles.angle2.toFixed(2)}°</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Add metadata fields directly on the results page */}
                  <div className="space-y-4 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Add Notes</label>
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
                        placeholder="Add notes about this measurement..."
                        maxLength={100}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Icons (Optional)</label>
                      <IconPicker
                        selectedIcons={selectedIcons}
                        onChange={setSelectedIcons}
                        maxSelection={3}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="w-full max-w-md flex flex-col gap-3 mt-6">
                <Button 
                  onClick={handleSubmitMetadata}
                  className="w-full py-2 px-4"
                >
                  Save Details
                </Button>
              </div>
            </div>
          </div>
        );
        
      case UploadStep.UPDATING:
        return (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Saving your details...</h3>
          </div>
        );
        
      case UploadStep.COMPLETE:
        return (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-xl font-medium text-gray-900 mb-2">Measurement Complete!</h3>
            <p className="text-gray-500 mb-8">Your image has been processed and all details saved successfully.</p>
            
            <Button 
              onClick={resetForm}
              className="px-6 py-2"
            >
              Upload Another Photo
            </Button>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 md:flex-row md:gap-2"
            onClick={() => setOpen(true)}
          >
            <Upload className="w-6 h-6" />
            <span className="text-xs md:text-sm">Upload</span>
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-xl overflow-y-auto"
          aria-describedby="upload-sheet-description"
        >
          <SheetTitle className="sr-only">Upload Image</SheetTitle>
          <SheetDescription id="upload-sheet-description" className="sr-only">
            Upload and process an image to measure angles
          </SheetDescription>
          <div className="absolute top-0 left-0 right-0 h-1 flex justify-center">
            <div className="w-12 h-1.5 rounded-full bg-gray-300 my-2" />
          </div>
          <div className="pt-6 pb-20">
            <div className="bg-white">
              {renderContent()}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
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
                setCurrentStep(UploadStep.INITIAL);
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
    </>
  );
}
