// Base interface that defines the essential structure of a measurement
export interface BaseMeasurement {
  date: string;        // Required for all measurement types - date in ISO format (YYYY-MM-DD)
  angle?: number;      // Primary angle measurement (optional in some contexts)
  angle2?: number;     // Secondary angle measurement (optional in some contexts)
  imageId?: number;    // Reference to the uploaded image ID
  hashKey?: string;    // Hash identifier for the measurement
  memo?: string;       // Optional user notes
  iconIds?: string;    // Comma-separated list of icon IDs
  id?: number;         // Database ID - optional for new or placeholder measurements
}

// Complete measurement with ID - used for editing and deleting existing measurements
export interface CompleteMeasurement extends BaseMeasurement {
  id: number;          // ID must exist when editing or performing API actions
}

// API measurement from the backend - matches backend structure exactly
export interface ApiMeasurement {
  id: number;
  userId: number;
  imageId: number;
  angle: number;
  angle2: number;
  timestamp: Date | string;
  memo: string | null;
  iconIds: string | null;
}

// For creating new measurements or metadata updates
export interface MeasurementMetadataUpdate {
  measurementId: number;
  memo?: string;
  iconIds?: number[] | string;  // Accept either array of numbers or comma-separated string
}

// Type for measurement deletion parameters
export interface MeasurementDeletionParams {
  measurementId: number;
  date: string;
}

// Response from the upload API
export interface UploadResponse {
  id: number;
  hashKey: string;
  angle: number;
  angle2: number;
  message: string;
}

// Type guard to check if a BaseMeasurement is a CompleteMeasurement
export function isCompleteMeasurement(measurement: BaseMeasurement): measurement is CompleteMeasurement {
  return measurement.id !== undefined;
}

// Type guard to check if measurement has angle data
export function hasMeasurementData(measurement: BaseMeasurement): boolean {
  return measurement.angle !== undefined || measurement.angle2 !== undefined;
}
