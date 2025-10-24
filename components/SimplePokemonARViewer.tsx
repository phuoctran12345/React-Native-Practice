import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, TouchableWithoutFeedback, Dimensions, Platform } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer, loadAsync } from 'expo-three';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { Buffer } from 'buffer';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { getGLBModelFromQRData, getGLBModelConfig } from '../utils/modelData';

interface PokemonARViewerProps {
  onClose: () => void;
}

const SimplePokemonARViewer = ({ onClose }: PokemonARViewerProps) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelInfo, setModelInfo] = useState<string>('');
  const [scannedData, setScannedData] = useState<string | null>(null);
  
  const modelRef = useRef<THREE.Object3D | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // ✅ PERMISSION CHECKS
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Đang yêu cầu quyền truy cập camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>❌ Không có quyền truy cập camera</Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ ONCONTEXTCREATE FUNCTION FOR GLVIEW
  const onContextCreate = (gl: any) => {
    console.log('🎬 Creating 3D context...');
    
    try {
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(75, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000);
      camera.position.set(0, 0, 5);
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ canvas: gl.canvas, context: gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setPixelRatio(gl.drawingBufferWidth / gl.drawingBufferHeight);
      
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Store refs
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      
      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        
        if (modelRef.current) {
          modelRef.current.rotation.y += 0.01;
        }
        
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      
      animate();
      console.log('🎬 3D Scene initialized successfully!');
      
    } catch (error) {
      console.error('Error creating 3D context:', error);
      setIsLoading(false);
    }
  };

  // ✅ SIMPLIFIED MODEL LOADING
  const loadPokemonModel = async (qrData: string) => {
    try {
      console.log('🎯 Starting simplified model loading for:', qrData);
      setIsLoading(true);
      setLoadingProgress(10);
      setModelInfo('Đang phân tích QR code...');

      const glbConfig = getGLBModelFromQRData(qrData);

      if (glbConfig) {
        console.log('✅ Model config found:', glbConfig.name);
        setModelInfo(`🦊 Đang tải model GLB: ${glbConfig.name}...`);
        setLoadingProgress(30);

        // Simple asset loading
        let asset: any;
        if (glbConfig.filePath === 'assets/models/pokemon_scizor.glb') {
          asset = Asset.fromModule(require('../assets/models/pokemon_scizor.glb'));
        } else if (glbConfig.filePath === 'assets/models/Fox.glb') {
          asset = Asset.fromModule(require('../assets/models/Fox.glb'));
        } else {
          throw new Error(`Unknown model filePath: ${glbConfig.filePath}`);
        }

        console.log('✅ Asset created:', asset.uri);
        await asset.downloadAsync();
        console.log('✅ Asset downloaded');

        // Simple GLTF loading
        const gltf = await loadAsync(asset);
        console.log('✅ GLTF loaded successfully');

        if (!gltf || !gltf.scene) {
          throw new Error('GLB file loaded but no scene found');
        }

        const loadedModel = gltf.scene;
        console.log('🎉 MODEL LOADED!', {
          children: loadedModel.children?.length || 0,
          animations: gltf.animations?.length || 0
        });

        // Simple model setup
        loadedModel.scale.setScalar(0.1);
        loadedModel.position.set(0, -0.1, 0);
        
        // Store scale for zoom limits
        (loadedModel as any).originalScale = 0.1;
        (loadedModel as any).minScale = 0.05;
        (loadedModel as any).maxScale = 0.3;

        // Simple material setup
        loadedModel.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (child.material) {
              child.material.needsUpdate = true;
            }
          }
        });

        // Simple animation setup
        if (gltf.animations && gltf.animations.length > 0) {
          console.log('🎬 Setting up animations...');
          mixerRef.current = new THREE.AnimationMixer(loadedModel);
          
          const firstClip = gltf.animations[0];
          const action = mixerRef.current.clipAction(firstClip);
          action.play();
          console.log('✅ Animation setup complete');
        }

        // Add model to scene
        if (sceneRef.current) {
          sceneRef.current.clear();
          
          // Add lighting back
          const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
          sceneRef.current.add(ambientLight);
          
          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
          directionalLight.position.set(1, 1, 1);
          sceneRef.current.add(directionalLight);
          
          // Add model to scene
          sceneRef.current.add(loadedModel);
          modelRef.current = loadedModel;
          
          console.log('✅ Model added to scene successfully');
          console.log('✅ Scene children count:', sceneRef.current.children.length);
        } else {
          console.error('❌ Scene not available for adding model');
        }

        // Complete loading
        setLoadingProgress(100);
        setIsLoading(false);
        setModelInfo(`✅ ${glbConfig.name} loaded successfully!`);
        
        console.log('🎉 MODEL LOADING COMPLETE!');

      } else {
        // Không tìm thấy model
        console.warn('⚠️ Unknown Pokemon model ID');
        setModelInfo('⚠️ Pokemon model không tồn tại');

        Alert.alert(
          '⚠️ Model không tồn tại',
          'QR code không chứa Pokemon model hợp lệ. Vui lòng thử QR code khác.',
          [{ text: 'OK' }]
        );

        setIsLoading(false);
      }
      
    } catch (error) {
      console.error('❌ Error loading Pokemon model:', error);
      setModelInfo('❌ Lỗi tải Pokemon model');
      setIsLoading(false);
    }
  };

  // Handle QR Code scan
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    console.log('🎯 QR Code scanned successfully:', data);
    setScannedData(data);
    loadPokemonModel(data);
  };

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    console.log('📷 Camera permission:', status === 'granted' ? 'GRANTED' : 'DENIED');
  };

  useEffect(() => {
    requestCameraPermission();
  }, []);

  // ✅ MAIN RETURN - COMPONENT JSX
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Camera làm background */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'pdf417'],
        }}
      />

      {/* GLView for 3D rendering */}
      <View style={styles.glContainer}>
        <GLView
          style={styles.glView}
          onContextCreate={onContextCreate}
        />
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>{modelInfo}</Text>

            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${loadingProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{loadingProgress}%</Text>

            <Text style={styles.systemInfo}>🎮 Pokemon AR System</Text>
          </View>
        </View>
      )}

      {/* UI Controls */}
      <View style={styles.overlay}>
        {!scannedData ? (
          <Text style={styles.instruction}>
            📱 Quét QR code để hiển thị Pokemon 3D
          </Text>
        ) : (
          <View>
            {scannedData && isLoading && (
              <Text style={styles.scannedData}>
                🔍 Đã quét: {scannedData}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeText}>❌ Đóng</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
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
  glContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  glView: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    zIndex: 1000,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? (Dimensions.get('window').height > 800 ? 60 : 40) : 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingHorizontal: 20,
  },
  instruction: {
    color: '#fff',
    fontSize: Dimensions.get('window').width < 375 ? 16 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: Dimensions.get('window').width - 40,
  },
  scannedData: {
    color: '#FFD700',
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 5,
  },
  closeButton: {
    backgroundColor: 'rgba(255,0,0,0.7)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  loadingText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: 200,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  progressText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  systemInfo: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
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
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default SimplePokemonARViewer;
