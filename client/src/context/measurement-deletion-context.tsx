import { createContext, useContext, ReactNode } from 'react';

interface MeasurementDeletionContextType {
  onMeasurementDeleted: (measurementId: number, date: string) => void;
}

// Create context with a default no-op function
const MeasurementDeletionContext = createContext<MeasurementDeletionContextType>({
  onMeasurementDeleted: () => {}
});

// Provider component
export const MeasurementDeletionProvider = ({ 
  children, 
  onMeasurementDeleted 
}: { 
  children: ReactNode; 
  onMeasurementDeleted: (measurementId: number, date: string) => void 
}) => {
  return (
    <MeasurementDeletionContext.Provider value={{ onMeasurementDeleted }}>
      {children}
    </MeasurementDeletionContext.Provider>
  );
};

// Hook to use the context
export const useMeasurementDeletion = () => useContext(MeasurementDeletionContext);
