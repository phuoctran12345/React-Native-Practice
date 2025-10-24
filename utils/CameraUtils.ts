import { Camera } from 'expo-camera';
import { useState, useEffect } from 'react';

/**
 * 🎯 Camera Utility Functions
 * Tích hợp camera system từ PokemonARViewer.tsx
 */

export interface CameraPermissionState {
  hasPermission: boolean | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * ✅ Camera Permission Hook
 * Kế thừa từ PokemonARViewer.tsx
 */
export const useCameraPermission = () => {
  const [permissionState, setPermissionState] = useState<CameraPermissionState>({
    hasPermission: null,
    isLoading: true,
    error: null
  });

  const requestCameraPermission = async () => {
    try {
      console.log('📷 Requesting camera permission...');
      setPermissionState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('📷 Camera permission status:', status);
      
      const hasPermission = status === 'granted';
      setPermissionState({
        hasPermission,
        isLoading: false,
        error: null
      });
      
      console.log('📷 Camera permission:', hasPermission ? 'GRANTED' : 'DENIED');
      return hasPermission;
    } catch (error) {
      console.error('❌ Camera permission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPermissionState({
        hasPermission: false,
        isLoading: false,
        error: errorMessage
      });
      return false;
    }
  };

  useEffect(() => {
    requestCameraPermission();
  }, []);

  return {
    ...permissionState,
    requestCameraPermission,
    retry: requestCameraPermission
  };
};

/**
 * ✅ Camera Configuration
 * Cấu hình camera từ PokemonARViewer.tsx
 */
export const getCameraConfig = () => ({
  facing: 'back' as const,
  barcodeScannerSettings: {
    barcodeTypes: ['qr', 'pdf417'] as const,
  }
});

/**
 * ✅ QR Code Handler
 * Xử lý QR code scanning từ PokemonARViewer.tsx
 */
export const createQRCodeHandler = (onScanned: (data: string) => void) => {
  return ({ type, data }: { type: string; data: string }) => {
    console.log('🎯 QR Code scanned successfully:', { type, data });
    onScanned(data);
  };
};

/**
 * ✅ Camera Permission Component Props
 * Props cho camera permission components
 */
export interface CameraPermissionProps {
  onRetry?: () => void;
  onClose?: () => void;
}

/**
 * ✅ Camera Error Handler
 * Xử lý lỗi camera từ PokemonARViewer.tsx
 */
export const handleCameraError = (error: any): string => {
  if (error?.message?.includes('permission')) {
    return 'Không có quyền truy cập camera. Vui lòng cấp quyền trong Settings.';
  }
  if (error?.message?.includes('not available')) {
    return 'Camera không khả dụng trên thiết bị này.';
  }
  return 'Lỗi camera không xác định. Vui lòng thử lại.';
};

/**
 * ✅ Camera Status Checker
 * Kiểm tra trạng thái camera
 */
export const checkCameraAvailability = async (): Promise<boolean> => {
  try {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Camera availability check failed:', error);
    return false;
  }
};

/**
 * ✅ Camera Permission States
 * Các trạng thái permission từ PokemonARViewer.tsx
 */
export const CAMERA_PERMISSION_STATES = {
  LOADING: 'loading',
  GRANTED: 'granted', 
  DENIED: 'denied',
  ERROR: 'error'
} as const;

export type CameraPermissionStateType = typeof CAMERA_PERMISSION_STATES[keyof typeof CAMERA_PERMISSION_STATES];
