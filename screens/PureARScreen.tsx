// 🎮 Pure AR Screen - Hoàn toàn dynamic
// QR Scanner → Pure AR Viewer → Dynamic 3D Loading

import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import PureQRScanner from '../components/PureQRScanner';
import PureARViewer from '../components/PureARViewer';

type ViewMode = 'scanner' | 'ar';

interface PureARScreenProps {
  onBack: () => void;
}

const PureARScreen: React.FC<PureARScreenProps> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('scanner');
  const [currentQRData, setCurrentQRData] = useState<string>('');

  const handleQRScanned = (qrData: string) => {
    console.log(`🎮 Pure AR Screen - QR Scanned: ${qrData}`);
    setCurrentQRData(qrData);
    setViewMode('ar');
  };

  const handleBackToScanner = () => {
    console.log('🔙 Back to QR Scanner');
    setViewMode('scanner');
    setCurrentQRData('');
  };

  const handleBackToMenu = () => {
    Alert.alert(
      '🔙 Back to Menu',
      'Are you sure you want to go back to the main menu?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go Back', onPress: onBack }
      ]
    );
  };

  if (viewMode === 'scanner') {
    return (
      <View style={styles.container}>
        <PureQRScanner
          onScanSuccess={handleQRScanned}
          onBack={handleBackToMenu}
        />
        
        {/* Info Panel */}
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>🎮 Pure Dynamic AR</Text>
          <Text style={styles.infoText}>
            Scan any QR code containing 3D model data
          </Text>
          <Text style={styles.infoSubText}>
            Supports: JSON format, simple model names, GitHub URLs
          </Text>
        </View>
      </View>
    );
  }

  if (viewMode === 'ar') {
    return (
      <View style={styles.container}>
        <PureARViewer
          modelData={currentQRData}
          onClose={handleBackToScanner}
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  infoPanel: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    padding: 15,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  infoSubText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PureARScreen;
