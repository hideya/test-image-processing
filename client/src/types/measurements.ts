// Base interface with common properties
export interface BaseMeasurement {
  date: string;        // Required for all measurement types
  angle?: number;      // Optional in some contexts
  angle2?: number;     // Optional in some contexts
  imageId?: number;    // Optional in some contexts
  hashKey?: string;    // Optional in some contexts
  memo?: string;       // Optional for all
  iconIds?: string;    // Optional for all
  id?: number;         // Optional for new measurements, required for existing ones
}

// For EditDetailsSheet, we need a measurement that has all the required fields
export interface CompleteMeasurement extends BaseMeasurement {
  id: number;          // ID must exist when editing
  // Note: We don't require angle and angle2 to be defined here
  // because the component handles undefined cases
}

// Type guard to check if a BaseMeasurement is a CompleteMeasurement
export function isCompleteMeasurement(measurement: BaseMeasurement): measurement is CompleteMeasurement {
  return measurement.id !== undefined;
}
