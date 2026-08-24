import { useContext } from 'react';
import { TourContext } from '../components/tour/TourProvider';

/**
 * Consumer hook for the guided tour system.
 * Provides tour state and controls for any component.
 */
export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within a <TourProvider>');
  }
  return ctx;
};
