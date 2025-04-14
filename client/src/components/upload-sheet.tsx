import React, { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient, getAuthToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  RotateCw, 
  RotateCcw, 
  AlertCircle, 
  Upload, 
  Camera, 
  Calendar as CalendarIcon,
  Check,
  X
} from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Removed Progress import
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iconOptions } from "@/lib/icons";

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
  children?: React.ReactNode;
}

export function UploadSheet({ onComplete, onCancel, children }: UploadSheetProps) {
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
  const [uploadProgress, setUploadProgress] = useState(0);
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

  // For simulating progress
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (currentStep === UploadStep.UPLOADING) {
      setUploadProgress(0);
      interval = setInterval(() => {
        setUploadProgress(prev => {
          // Simulate progress up to 90% (the final 10% will happen when response comes back)
          if (prev < 90) {
            return prev + 5;
          }
          return prev;
        });
      }, 200);
    } else if (uploadProgress < 100 && (currentStep === UploadStep.RESULTS || currentStep === UploadStep.COMPLETE)) {
      setUploadProgress(100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStep, uploadProgress]);

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
  // Simplified formatTableDayPart function
  const formatTableDayPart = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const weekDayJP = ["日", "月", "火", "水", "木", "金", "土"];
    return weekDayJP[dayOfWeek];
  };

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

  // Using all icons in a single row

  // Render different content based on the current step
  const renderContent = () => {
    switch (currentStep) {
      case UploadStep.INITIAL:
        return (
          <div className="space-y-4">
            {/* Date Selection */}
            <div className="flex items-center space-x-4">
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full flex justify-between items-center text-left rounded-lg font-normal"
                  >
                    <div className="flex items-center">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate
                        ? format(customDate, "yyyy年 M月 d日")
                        : "Select date"}
                    </div>
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                      {customDate && formatTableDayPart(customDate.toISOString())}曜日
                    </span>
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
            </div>

            {/* File Selection Area */}
            <Card className="border-dashed border-2 border-blue-200 bg-blue-50/30 hover:bg-blue-50 transition-colors rounded-xl">
            <CardContent className="pt-4 pb-4 flex flex-col items-center justify-center">
                <input
                  type="file"
                  id="file-upload-sheet"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {!previewUrl ? (
                  <label
                    htmlFor="file-upload-sheet"
                    className="w-full flex flex-col items-center justify-center cursor-pointer"
                  >
                    <div className="bg-blue-100 text-blue-600 rounded-full p-4 mb-4 shadow-md">
                      <Camera className="h-10 w-10 text-blue-500" />
                    </div>
                    <p className="text-blue-700 mb-2 font-medium">Click to select a photo</p>
                    <p className="text-blue-500 text-sm text-center max-w-xs">
                      Upload a clear image to measure angles accurately
                    </p>
                  </label>
                ) : (
                  <div className="w-full">
                    <div className="relative">
                        <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-[35vh] object-contain rounded-md mx-auto"
                        style={{
                          transform: `rotate(${previewRotation}deg)`,
                          transition: "transform 0.3s ease",
                        }}
                      />
                      
                      {/* Rotation Controls */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow">
                        <button
                          type="button"
                          className="p-2 hover:bg-gray-100 rounded-full"
                          onClick={() => setPreviewRotation((prev) => (prev - 90) % 360)}
                        >
                          <RotateCcw className="h-5 w-5 text-gray-700" />
                        </button>
                        <button
                          type="button"
                          className="p-2 hover:bg-gray-100 rounded-full"
                          onClick={() => setPreviewRotation((prev) => (prev + 90) % 360)}
                        >
                          <RotateCw className="h-5 w-5 text-gray-700" />
                        </button>
                      </div>
                      
                      {/* Image Info & Change Button */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-gray-500 truncate max-w-[60%]">
                          {selectedFile?.name}
                        </p>
                        <label
                          htmlFor="file-upload-sheet"
                          className="text-sm text-blue-600 cursor-pointer"
                        >
                          Change
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Button */}
            {selectedFile && (
              <Button
                onClick={handleUpload}
                className="w-full py-6 rounded-xl text-base font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload and Analyze
              </Button>
            )}

            {/* Previous Results Card (if available) */}
            {processedImageUrl && processedAngles && !selectedFile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Previous Results</CardTitle>
                  <CardDescription>
                    Your last analyzed measurement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative h-[25vh] rounded-md overflow-hidden">
                    <img
                      src={processedImageUrl}
                      alt="Processed image"
                      className="object-contain h-full w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Left Angle</p>
                      <p className="text-xl font-semibold">{processedAngles.angle.toFixed(2)}°</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Right Angle</p>
                      <p className="text-xl font-semibold">{processedAngles.angle2.toFixed(2)}°</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Close Button - Only shown in initial state when no photo is selected */}
            {!selectedFile && !processedImageUrl && (
              <div className="fixed bottom-8 left-0 right-0 flex justify-center">
                <Button 
                  variant="outline"
                  onClick={handleCloseSheet}
                  className="rounded-full w-12 h-12 p-0 border-gray-300 shadow-md flex items-center justify-center bg-white hover:bg-gray-50"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </Button>
              </div>
            )}
          </div>
        );
        
      case UploadStep.UPLOADING:
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-5">
            <div className="bg-blue-100 rounded-full p-4 shadow-md">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-medium text-gray-900 mb-2">Processing Image</h3>
              <p className="text-gray-500 max-w-xs mx-auto">
                We're analyzing your image and calculating the angles. This may take a moment.
              </p>
            </div>
            
            <div className="w-full max-w-md space-y-2">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div 
                  className="h-full bg-blue-600 transition-all" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 text-right">{uploadProgress}%</p>
            </div>
          </div>
        );
        
      case UploadStep.RESULTS:
        return (
          <div className="space-y-5">
            <div className="text-center mb-2">
              <h3 className="text-xl font-medium text-gray-900">Analysis Results</h3>
              <p className="text-gray-500">
                {format(customDate, "yyyy年 M月 d日")} ({formatTableDayPart(customDate.toISOString())}曜日)
              </p>
            </div>
            
            {processedImageUrl && (
              <div>
                <Card className="mb-6 shadow-md rounded-xl overflow-hidden border-0">
                  <CardContent className="pt-6">
                    <div className="relative h-[30vh] rounded-md overflow-hidden mb-4">
                      <img
                        src={processedImageUrl}
                        alt="Processed image"
                        className="object-contain h-full w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                {processedAngles && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-md rounded-xl transform transition-transform hover:scale-105">
                      <CardContent className="pt-6 text-center">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Left Angle</h4>
                        <p className="text-3xl font-bold text-blue-700">{processedAngles.angle.toFixed(2)}°</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-md rounded-xl transform transition-transform hover:scale-105">
                      <CardContent className="pt-6 text-center">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Right Angle</h4>
                        <p className="text-3xl font-bold text-purple-700">{processedAngles.angle2.toFixed(2)}°</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {/* Add metadata fields with improved UI */}
                <div className="space-y-5 mt-8">
                  <div className="space-y-2">
                    <Label htmlFor="memo" className="text-gray-700">Add Notes (Optional)</Label>
                    <Input
                      type="text"
                      id="memo"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault(); // Prevent form submission
                        }
                      }}
                      className="w-full"
                      placeholder="Add notes about this measurement..."
                      maxLength={100}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-gray-700">Select Icons (Optional)</Label>
                      {selectedIcons.length === 3 && (
                        <p className="text-xs text-amber-600">
                          Max 3 selected
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {iconOptions.map(icon => (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => {
                            if (selectedIcons.includes(icon.id)) {
                              setSelectedIcons(selectedIcons.filter(id => id !== icon.id));
                            } else if (selectedIcons.length < 3) {
                              setSelectedIcons([...selectedIcons, icon.id]);
                            } else {
                              // Remove oldest and add new
                              setSelectedIcons([...selectedIcons.slice(1), icon.id]);
                            }
                          }}
                          className={`
                            w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all
                            ${selectedIcons.includes(icon.id)
                              ? "bg-blue-100 border-2 border-blue-500 shadow-md transform scale-110"
                              : "bg-gray-100 hover:bg-gray-200 hover:shadow"}
                          `}
                        >
                          {icon.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleSubmitMetadata}
                  className="w-full py-5 mt-6 rounded-xl text-base font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  size="lg"
                >
                  Save Measurement
                </Button>
              </div>
            )}
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
          <div className="text-center py-8 space-y-5">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4 shadow-md animate-in fade-in-50 zoom-in-95 duration-300">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-2xl font-medium text-gray-900 mb-2 animate-in fade-in-50 duration-300 delay-150">Measurement Complete!</h3>
              <p className="text-gray-500 max-w-xs mx-auto animate-in fade-in-50 duration-300 delay-300">
                Your image has been processed and all details saved successfully.
              </p>
            </div>
            
            <div className="pt-6 space-y-4">
              <Button 
                onClick={resetForm}
                className="px-8 py-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 animate-in fade-in-50 duration-300 delay-500"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Upload Another Photo
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => {
        // Only allow closing if not in uploading or updating state
        if (!isOpen && currentStep !== UploadStep.UPLOADING && currentStep !== UploadStep.UPDATING) {
          setOpen(isOpen);
          if (!isOpen) handleCloseSheet();
        } else if (isOpen) {
          setOpen(isOpen);
        }
      }}>
        <SheetTrigger asChild>
          {children ? (
            children
          ) : (
            <button
              type="button"
              className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 rounded-md py-2 md:flex-row md:gap-2"
              onClick={() => setOpen(true)}
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs md:text-sm">Upload</span>
            </button>
          )}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className={`rounded-t-xl overflow-y-auto ${currentStep === UploadStep.INITIAL && !selectedFile ? 'h-[60vh]' : 'h-[85vh]'}`}
          onCloseAutoFocus={() => {
            if (currentStep !== UploadStep.UPLOADING && currentStep !== UploadStep.UPDATING) {
              handleCloseSheet();
            }
          }}
        >
          <SheetTitle className="">Upload Image</SheetTitle>
          {/* Removed custom close button - using the built-in one from SheetContent */}
          <div className="absolute top-0 left-0 right-0 flex justify-center z-10">
            <div className="w-12 h-1 rounded-full bg-gray-300 mt-3 mb-1" />
          </div>
          <div className="pt-6 pb-16 px-6">
            <div className="mx-auto max-w-md">
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