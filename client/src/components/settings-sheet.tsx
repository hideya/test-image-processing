import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CheckCircle, LogOut, Settings as SettingsIcon, X } from "lucide-react";

import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/themed-sheet";
import ColorPicker from '@/components/ColorPicker.tsx';

// Form schema
const settingsFormSchema = z.object({
  timezone: z.string({
    required_error: "Please select a timezone.",
  }),
  dateFormat: z.string({
    required_error: "Please select a date format.",
  }),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface SettingsSheetProps {
  onComplete?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

export function SettingsSheet({ onComplete, onCancel, children }: SettingsSheetProps) {
  const { settings, updateSettings } = useSettings();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize form with current settings
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
    },
  });

  // Handle form submission
  function onSubmit(data: SettingsFormValues) {
    // Update settings
    updateSettings(data);

    // Show success message
    setShowSuccess(true);

    // Set a timer to hide the success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);

    // Show toast notification
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
      variant: "success",
      duration: 3000,
    });

    // Reset form with new values
    form.reset(data);
  }

  const handleLogout = () => {
    setOpen(false);
    logoutMutation.mutate();
  };

  const handleCloseSheet = () => {
    setOpen(false);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ? (
          children
        ) : (
          <button
            type="button"
            className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 rounded-md py-2 md:flex-row md:gap-2"
            onClick={() => setOpen(true)}
          >
            <SettingsIcon className="w-6 h-6" />
            <span className="text-xs md:text-sm">Settings</span>
          </button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-xl overflow-y-auto"
      >
        <SheetTitle className="">Settings</SheetTitle>
        <SheetDescription>
        </SheetDescription>
        <div className="absolute top-0 left-0 right-0 flex justify-center z-10">
          <div className="w-12 h-1 rounded-full bg-gray-300 mt-3 mb-1" />
        </div>
        <div className="pt-6 pb-20 px-6">
          <div className="mx-auto max-w-md">
            <div className="space-y-4">

             <div className="mt-4 space-y-2">
                <Button
                  variant="destructive"
                  className="w-full py-3 rounded-xl shadow-md hover:shadow-lg text-sm"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>

              <Card className="shadow-md rounded-xl border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">Account Information</CardTitle>
                  <CardDescription className="text-xs"></CardDescription>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-500">Username</span>
                      <span className="font-medium">{user?.username}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-500">Email</span>
                      <span>{user?.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-500">
                        Account Created
                      </span>
                      <span>April 2025</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md rounded-xl border border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base text-theme-dark">Appearance Settings</CardTitle>
                  <CardDescription className="text-xs"></CardDescription>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <ColorPicker />
                </CardContent>
              </Card>

              {showSuccess && (
                <Alert className="bg-green-50 border-green-200 text-green-800 animate-in fade-in duration-300">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <AlertDescription>
                    Settings saved successfully!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>

        {/* Close Button - positioned at bottom right to match settings button location */}
        <div className="fixed bottom-8 right-8 flex justify-center">
          <Button 
            variant="outline"
            onClick={handleCloseSheet}
            className="rounded-full w-12 h-12 p-0 border-theme shadow-md flex items-center justify-center bg-white hover:bg-gray-50"
          >
            <X className="h-5 w-5 text-theme-dark" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
