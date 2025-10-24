import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useCameraPermission, getCameraConfig, createQRCodeHandler, handleCameraError } from '../utils/CameraUtils';

const CameraTest = () => {
  // ✅ Sử dụng camera permission hook từ PokemonARViewer
  const cameraPermission = useCameraPermission();
  const [scannedData, setScannedData] = useState<string | null>(null);

  // ✅ QR Code handler từ PokemonARViewer
  const handleQRScanned = createQRCodeHandler((data: string) => {
    setScannedData(data);
    Alert.alert('QR Code Scanned', `Data: ${data}`, [
      { text: 'OK', onPress: () => setScannedData(null) }
    ]);
  });

  // ✅ Permission states từ PokemonARViewer
  if (cameraPermission.isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Đang yêu cầu quyền truy cập camera...</Text>
      </View>
    );
  }

  if (!cameraPermission.hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>❌ Không có quyền truy cập camera</Text>
        {cameraPermission.error ? <Text style={styles.errorText}>{cameraPermission.error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={cameraPermission.retry}>
          <Text style={styles.buttonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ Camera config từ PokemonARViewer
  const cameraConfig = getCameraConfig();

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={cameraConfig.facing}
        onBarcodeScanned={scannedData ? undefined : handleQRScanned}
        barcodeScannerSettings={cameraConfig.barcodeScannerSettings}
      />
      <View style={styles.overlay}>
        <Text style={styles.instruction}>📱 Quét QR code để test camera</Text>
        {scannedData && (
          <Text style={styles.scannedText}>✅ Đã quét: {scannedData}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    margin: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 10,
  },
});

export default CameraTest;