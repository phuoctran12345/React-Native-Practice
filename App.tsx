import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Tắt các log gây spam - Sử dụng LogBox thay vì console.disableYellowBox (deprecated)
LogBox.ignoreAllLogs(); // Tắt tất cả logs và warnings
LogBox.ignoreLogs([
  'EXGL: gl.pixelStorei() doesn\'t support this parameter yet!',
  'THREE.GLTFLoader: Couldn\'t load texture',
  'Warning: THREE.WebGLRenderer: EXT_color_buffer_float extension not supported',
  'Creating blobs from \'ArrayBuffer\' and \'ArrayBufferView\' are not supported',
  'THREE.WebGLRenderer: EXT_color_buffer_float extension not supported',
  'gl.pixelStorei() doesn\'t support this parameter yet!',
  'EXT_color_buffer_float extension not supported',
  'Couldn\'t load texture',
  'Creating blobs from',
  'ArrayBufferView are not supported'
]);

// Override console để tắt logs spam (backup solution)
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('EXGL:') || 
      message.includes('gl.pixelStorei') || 
      message.includes('THREE.GLTFLoader') ||
      message.includes('EXT_color_buffer_float') ||
      message.includes('Creating blobs from') ||
      message.includes('ArrayBufferView are not supported')) {
    return; // Không hiển thị logs spam
  }
  originalConsoleLog(...args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('EXGL:') || 
      message.includes('gl.pixelStorei') || 
      message.includes('THREE.GLTFLoader') ||
      message.includes('EXT_color_buffer_float') ||
      message.includes('Creating blobs from') ||
      message.includes('ArrayBufferView are not supported')) {
    return; // Không hiển thị warnings spam
  }
  originalConsoleWarn(...args);
};

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('EXGL:') || 
      message.includes('gl.pixelStorei') || 
      message.includes('THREE.GLTFLoader') ||
      message.includes('EXT_color_buffer_float') ||
      message.includes('Creating blobs from') ||
      message.includes('ArrayBufferView are not supported')) {
    return; // Không hiển thị errors spam
  }
  originalConsoleError(...args);
};

import Demo from './components/Demo';
import ARScreen from './screens/ARScreen';
import PureARScreen from './screens/PureARScreen';
import PokemonARViewer from './components/PokemonARViewer';
import SimpleARViewer from './components/SimpleARViewer';
import OptimizedARViewer from './components/OptimizedARViewer';

type AppMode = 'menu' | 'sketchfab' | 'ar' | 'pure-ar' | 'pokemon-ar' | 'simple-ar' | 'optimized-ar';

export default function App() {
  const [mode, setMode] = useState<AppMode>('menu');

  // Menu chính để chọn demo
  if (mode === 'menu') {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="auto" />
          
          <Text style={styles.title}>🎮 Demo App</Text>
          <Text style={styles.subtitle}>Chọn demo bạn muốn xem</Text>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: '#007AFF' }]}
            onPress={() => setMode('sketchfab')}
          >
            <Text style={styles.menuButtonText}>
              🌐 Sketchfab 3D Viewer{'\n'}
              <Text style={styles.menuButtonSubtext}>(Pikachu vs Raichu)</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: '#34C759' }]}
            onPress={() => setMode('ar')}
          >
            <Text style={styles.menuButtonText}>
              📱 AR Model Viewer (Legacy){'\n'}
              <Text style={styles.menuButtonSubtext}>(Quét QR + AR Camera)</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: '#FF9500' }]}
            onPress={() => setMode('pure-ar')}
          >
            <Text style={styles.menuButtonText}>
              🚀 Pure Dynamic AR{'\n'}
              <Text style={styles.menuButtonSubtext}>(Hoàn toàn dynamic - Không hardcode)</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: '#8B0000' }]}
            onPress={() => setMode('pokemon-ar')}
          >
            <Text style={styles.menuButtonText}>
              🦂 Pokemon AR Camera (Complex){'\n'}
              <Text style={styles.menuButtonSubtext}>(Camera + QR Scanner + Pokemon 3D đầy đủ màu sắc)</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: '#FF6B6B' }]}
            onPress={() => setMode('simple-ar')}
          >
            <Text style={styles.menuButtonText}>
              🚀 Simple AR (Recommended){'\n'}
              <Text style={styles.menuButtonSubtext}>(Đơn giản - Chỉ load GLB trực tiếp)</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: '#9B59B6' }]}
            onPress={() => setMode('optimized-ar')}
          >
            <Text style={styles.menuButtonText}>
              📱 Optimized AR (iPhone 12 Pro Max){'\n'}
              <Text style={styles.menuButtonSubtext}>(Tối ưu cho iPhone 12 Pro Max - Perfect positioning)</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </SafeAreaProvider>
    );
  }

  // Demo Sketchfab
  if (mode === 'sketchfab') {
    return (
      <SafeAreaProvider>
        <View style={styles.demoContainer}>
          <Demo />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setMode('menu')}
          >
            <Text style={styles.backButtonText}>⬅️ Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  // Demo AR (Legacy)
  if (mode === 'ar') {
    return (
      <SafeAreaProvider>
        <View style={styles.demoContainer}>
          <ARScreen />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setMode('menu')}
          >
            <Text style={styles.backButtonText}>⬅️ Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }


  // Pokemon AR Camera
  if (mode === 'pokemon-ar') {
    return (
      <SafeAreaProvider>
        <View style={styles.demoContainer}>
          <PokemonARViewer onClose={() => setMode('menu')} />
        </View>
      </SafeAreaProvider>
    );
  }

  // Simple AR (Recommended)
  if (mode === 'simple-ar') {
    return (
      <SafeAreaProvider>
        <View style={styles.demoContainer}>
          <SimpleARViewer />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setMode('menu')}
          >
            <Text style={styles.backButtonText}>⬅️ Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  // Optimized AR (iPhone 12 Pro Max)
  if (mode === 'optimized-ar') {
    return (
      <SafeAreaProvider>
        <View style={styles.demoContainer}>
          <OptimizedARViewer />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setMode('menu')}
          >
            <Text style={styles.backButtonText}>⬅️ Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  // Pure Dynamic AR
  return (
    <SafeAreaProvider>
      <View style={styles.demoContainer}>
        <PureARScreen onBack={() => setMode('menu')} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  demoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  menuButton: {
    width: '100%',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  menuButtonSubtext: {
    fontSize: 14,
    fontWeight: 'normal',
    opacity: 0.9,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1000,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
