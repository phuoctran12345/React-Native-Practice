// 🎮 Pure QR Scanner - Hoàn toàn dynamic (Expo SDK 54 Compatible)
// Scan any QR code → Parse → Load 3D model

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

interface PureQRScannerProps {
  onScanSuccess: (qrData: string) => void;
  onBack: () => void;
}

const PureQRScanner: React.FC<PureQRScannerProps> = ({ onScanSuccess, onBack }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [lastScannedData, setLastScannedData] = useState<string>('');

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  // ✅ Expo SDK 54 compatible barcode scanning
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned || data === lastScannedData) return;
    
    console.log(`📱 QR Code scanned: ${data}`);
    
    // Filter out Expo/Web URLs
    if (data.startsWith('exp://') || data.startsWith('http://') || data.startsWith('https://')) {
      console.warn(`⚠️ Ignoring Expo/Web URL: ${data}`);
      return; // Don't set scanned = true, continue scanning
    }
    
    setScanned(true);
    setLastScannedData(data);
    
    // Validate QR data
    if (data && data.trim().length > 0) {
      Alert.alert(
        '📱 QR Code Detected',
        `Data: ${data}\n\nLoad this 3D model?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setScanned(false)
          },
          {
            text: 'Load Model',
            onPress: () => {
              console.log(`🎮 Loading model from QR: ${data}`);
              onScanSuccess(data);
            }
          }
        ]
      );
    } else {
      Alert.alert('❌ Invalid QR Code', 'QR code data is empty or invalid');
      setScanned(false);
    }
  };

  const handleTestModel = (modelId: string) => {
    console.log(`🧪 Testing model: ${modelId}`);
    onScanSuccess(modelId);
  };

  const handleTestCustomModel = () => {
    const customModelData = JSON.stringify({
      modelId: "custom_pokemon",
      name: "Custom Pokemon",
      fileName: "pokemon_scizor.glb",
      repository: "phuoctran12345/pokemon-3d-models",
      branch: "main",
      scale: 0.8,
      position: { x: 0.2, y: -0.6, z: 0.1 },
      animations: ["idle", "walk"],
    });
    console.log(`🧪 Testing custom model: ${customModelData}`);
    onScanSuccess(customModelData);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Yêu cầu quyền truy cập camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Không có quyền truy cập camera</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>⬅️ Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ Expo SDK 54 CameraView with barcode scanning */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "pdf417"],
        }}
      />
      
      <View style={styles.overlay}>
        <Text style={styles.scanText}>🎯 Quét mã QR để xem model 3D</Text>
        <Text style={styles.subText}>Pure Dynamic AR System</Text>
        <Text style={styles.warningText}>⚠️ Không quét QR code của Expo!</Text>
        
        <View style={styles.qrFrame} />
        
        {scanned && (
          <TouchableOpacity 
            style={styles.scanAgainButton} 
            onPress={() => {
              setScanned(false);
              setLastScannedData('');
            }}
          >
            <Text style={styles.scanAgainText}>🔄 Quét lại</Text>
          </TouchableOpacity>
        )}

        {/* Test Buttons */}
        <View style={styles.testButtonsContainer}>
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#FF6B6B' }]} 
            onPress={() => handleTestModel('scizor')}
          >
            <Text style={styles.testButtonText}>🦂 Scizor</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#FFD93D' }]} 
            onPress={() => handleTestModel('pikachu_sample.glb')}
          >
            <Text style={styles.testButtonText}>⚡ Pikachu</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#6BCF7F' }]} 
            onPress={handleTestCustomModel}
          >
            <Text style={styles.testButtonText}>🎮 Custom</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>⬅️ Quay lại</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  message: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 18,
    color: '#fff',
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scanText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 40,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subText: {
    fontSize: 14,
    color: '#FFD93D',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,107,107,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  qrFrame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: '#00FF88',
    borderRadius: 20,
    backgroundColor: 'rgba(0,255,136,0.1)',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  scanAgainButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: 30,
    gap: 10,
  },
  testButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PureQRScanner;