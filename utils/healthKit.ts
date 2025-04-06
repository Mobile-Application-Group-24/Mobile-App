import { Platform, Linking } from 'react-native';

// Import with require to handle module resolution issues
let AppleHealthKit: any = null;
if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch (error) {
    console.error('Failed to import react-native-health:', error);
  }
}

// Define the permissions we need
const PERMISSIONS = {
  permissions: {
    read: [
      'Steps',
      'StepCount', 
      'DistanceWalkingRunning',
      'ActiveEnergyBurned'
    ].map(type => AppleHealthKit?.Constants.Permissions[type] || type),
    write: []
  }
};

export const isHealthAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !AppleHealthKit) return false;
  
  // Check if HealthKit is available on this device
  return true; // HealthKit should be available on all modern iOS devices
};

export const initHealthKit = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !AppleHealthKit) return false;

  try {
    return new Promise((resolve) => {
      // Initialize HealthKit with our permissions
      AppleHealthKit.initHealthKit(PERMISSIONS, (error: string) => {
        if (error) {
          console.log('[HealthKit] Error initializing HealthKit: ', error);
          resolve(false);
          return;
        }
        
        // Verify permission by attempting to read data
        verifyPermission().then(resolve);
      });
    });
  } catch (error) {
    console.error('[HealthKit] Init error:', error);
    return false;
  }
};

// Helper to verify if we actually have permission
const verifyPermission = async (): Promise<boolean> => {
  if (!AppleHealthKit) return false;
  
  return new Promise((resolve) => {
    const options = {
      startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
      endDate: new Date().toISOString(),
    };
    
    AppleHealthKit.getStepCount(options, (error: string) => {
      if (error) {
        console.log('[HealthKit] Permission verification failed:', error);
        resolve(false);
        return;
      }
      console.log('[HealthKit] Permission verified successfully');
      resolve(true);
    });
  });
};

export const getStepCount = async (): Promise<number> => {
  if (Platform.OS !== 'ios' || !AppleHealthKit) return 0;

  try {
    const options = {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      endDate: new Date().toISOString(),
    };

    return new Promise((resolve) => {
      AppleHealthKit.getStepCount(options, (error: string, results: any) => {
        if (error) {
          console.error('Error getting step count: ', error);
          resolve(0);
          return;
        }
        resolve(results?.value || 0);
      });
    });
  } catch (error) {
    console.error('HealthKit steps error:', error);
    return 0;
  }
};
