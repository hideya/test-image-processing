import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getAuthToken } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Measurement {
  id: number;
  userId: number;
  imageId: number;
  angle: number;
  angle2: number;
  timestamp: Date;
  memo: string | null;
  iconIds: string | null;
}

interface MeasurementData {
  date: string;
  angle: number;
  angle2: number;
  imageId: number;
  hashKey: string;
  memo?: string;
  iconIds?: string;
  id: number; // Added id for direct API actions
}

export function useMeasurementActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Mutation for updating measurement metadata (memo & icons)
  const updateMetadataMutation = useMutation({
    mutationFn: async ({ 
      measurementId, 
      memo, 
      iconIds 
    }: { 
      measurementId: number; 
      memo?: string; 
      iconIds?: number[] 
    }) => {
      setIsUpdating(true);
      
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Always send iconIds as a string (empty string if array is empty)
      const iconIdsString = iconIds ? (iconIds.length > 0 ? iconIds.join(',') : "") : undefined;
      
      const response = await apiRequest(
        'PATCH', 
        `/api/measurements/${measurementId}/metadata`,
        {
          memo,
          iconIds: iconIdsString
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update metadata");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Details updated",
        description: "Measurement details have been updated successfully.",
        variant: "success",
      });

      // Invalidate the relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/angle-data"] });
      
      setIsUpdating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update measurement details",
        variant: "destructive",
      });
      
      setIsUpdating(false);
    },
  });

  // Mutation for deleting a measurement
  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: number) => {
      setIsDeleting(true);
      
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await apiRequest(
        'DELETE',
        `/api/measurements/${measurementId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete measurement");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Measurement deleted",
        description: "The measurement has been permanently removed.",
        variant: "success",
      });

      // Invalidate the relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/angle-data"] });
      
      setIsDeleting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete measurement",
        variant: "destructive",
      });
      
      setIsDeleting(false);
    },
  });

  return {
    updateMetadata: updateMetadataMutation.mutate,
    deleteMeasurement: deleteMeasurementMutation.mutate,
    isUpdating,
    isDeleting
  };
}
