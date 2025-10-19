// 🎮 Pure AR Viewer - Hoàn toàn dynamic, không hardcode
// QR → GitHub → 3D Model → AR

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { pureDynamicLoader, QRData } from '../utils/PureDynamicLoader';

interface PureARViewerProps {
  modelData: string; // Raw QR code data
  onClose: () => void;
  // Dynamic UI configuration
  uiConfig?: {
    title?: string;
    subtitle?: string;
    debugLabel?: string;
    clearLabel?: string;
    reloadLabel?: string;
    closeLabel?: string;
    theme?: {
      primary?: string;
      secondary?: string;
      danger?: string;
      success?: string;
    };
  };
}

const PureARViewer: React.FC<PureARViewerProps> = ({ modelData, onClose, uiConfig = {} }) => {
  // Dynamic UI configuration with defaults
  const config = {
    title: uiConfig.title || '📱 Pure Dynamic AR Model',
    subtitle: uiConfig.subtitle || '👆 Swipe to rotate • Move phone to view from different angles',
    debugLabel: uiConfig.debugLabel || '🔧 Debug',
    clearLabel: uiConfig.clearLabel || '🗑️ Clear',
    reloadLabel: uiConfig.reloadLabel || '🔄 Reload',
    closeLabel: uiConfig.closeLabel || '❌ Close',
    theme: {
      primary: uiConfig.theme?.primary || '#007AFF',
      secondary: uiConfig.theme?.secondary || '#FFD700',
      danger: uiConfig.theme?.danger || '#FF0000',
      success: uiConfig.theme?.success || '#32C832',
    }
  };
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelInfo, setModelInfo] = useState<string>('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugData, setDebugData] = useState<any>({});
  
  const modelRef = useRef<THREE.Object3D | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });

  // Request camera permission
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Enhanced gesture handler for 360° rotation
  const onGestureEvent = (event: any) => {
    if (modelRef.current) {
      const { translationX, translationY } = event.nativeEvent;
      const rotationSpeed = 0.01; // Increased for better responsiveness
      
      // Horizontal swipe: rotate around Y-axis (left/right) - FULL 360°
      rotationRef.current.y += translationX * rotationSpeed;
      // Remove limits for full 360° rotation
      
      // Vertical swipe: rotate around X-axis (up/down) with limits
      const newRotationX = rotationRef.current.x + translationY * rotationSpeed;
      rotationRef.current.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, newRotationX)); // Limit vertical rotation
      
      // Apply smooth rotation
      modelRef.current.rotation.y = rotationRef.current.y;
      modelRef.current.rotation.x = rotationRef.current.x;
      
      // Update debug info
      if (showDebugInfo) {
        updateDebugInfo();
      }
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
        // console.log('🎮 Gesture ended'); // Giảm log
    }
  };

  // Debug functions
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
    if (!showDebugInfo) {
      updateDebugInfo();
    }
  };

  const updateDebugInfo = () => {
    if (modelRef.current) {
      const info = {
        modelId: (modelRef.current as any).modelId || 'unknown',
        fileName: (modelRef.current as any).fileName || 'unknown',
        sourceUrl: (modelRef.current as any).sourceUrl || 'unknown',
        isDynamic: (modelRef.current as any).isDynamic || false,
        isFallback: (modelRef.current as any).isFallback || false,
        loadedAt: (modelRef.current as any).loadedAt || 'unknown',
        position: {
          x: modelRef.current.position.x.toFixed(2),
          y: modelRef.current.position.y.toFixed(2),
          z: modelRef.current.position.z.toFixed(2)
        },
        rotation: {
          x: modelRef.current.rotation.x.toFixed(2),
          y: modelRef.current.rotation.y.toFixed(2),
          z: modelRef.current.rotation.z.toFixed(2)
        },
        scale: modelRef.current.scale.x.toFixed(2),
        children: modelRef.current.children.length,
        cacheInfo: pureDynamicLoader.getCacheInfo()
      };
      setDebugData(info);
    }
  };

  const clearCache = () => {
    pureDynamicLoader.clearCache();
    setModelInfo('🗑️ Cache cleared');
    updateDebugInfo();
  };

  const reloadModel = () => {
    setModelInfo('🔄 Reloading model...');
    setIsLoading(true);
    setLoadingProgress(0);
    
    if (modelRef.current) {
      modelRef.current = null;
    }
    
    // Reload after delay
    setTimeout(() => {
      Alert.alert(
        '🔄 Reload App',
        'Please restart the Expo Go app manually to reload the model.',
        [{ text: 'OK' }]
      );
    }, 500);
  };

  // Main 3D context creation
  const onContextCreate = async (gl: any) => {
    try {
      // console.log('🎮 Pure AR Viewer - Creating 3D context'); // Giảm log
      
      // Setup scene, camera, renderer (optimized for iPhone 12 Pro Max)
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        65, // Optimized FOV for iPhone 12 Pro Max (6.7" screen)
        gl.drawingBufferWidth / gl.drawingBufferHeight, 
        0.1, 
        50
      );
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0); // Transparent background for AR
      
      // Reduce EXGL warnings
      renderer.shadowMap.enabled = false; // Disable shadows to reduce GL calls
      renderer.setPixelRatio(1); // Fixed pixel ratio
      
      // Position camera optimized for iPhone 12 Pro Max (6.7" screen) - Gần hơn để thấy model rõ
      camera.position.set(0, 0.1, 1.0); // Gần hơn từ 1.5 xuống 1.0

      // Enhanced lighting for better colors - Tăng cường lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Tăng từ 0.8 lên 1.2
      scene.add(ambientLight);

      // Main directional light - Tăng cường
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Tăng từ 0.6 lên 1.0
      directionalLight.position.set(2, 5, 3);
      directionalLight.castShadow = false; // Disable shadows
      scene.add(directionalLight);
      
      // Thêm light đỏ để tăng cường màu Scizor
      const redLight = new THREE.DirectionalLight(0xFF6666, 0.5); // Red light
      redLight.position.set(-2, 3, 2);
      scene.add(redLight);

      // Load model from QR data
      try {
        // console.log('🎮 Starting Pure Dynamic Loading...'); // Giảm log
        setLoadingProgress(10);
        setModelInfo('Parsing QR code...');
        
        // Parse QR data
        const parsedQR = pureDynamicLoader.parseQRCode(modelData);
        if (!parsedQR) {
          console.error(`❌ Invalid QR code format: ${modelData}`);
          setModelInfo(`❌ QR code không hợp lệ: ${modelData.substring(0, 30)}...`);
          throw new Error('Invalid QR code format');
        }
        
        setLoadingProgress(30);
        setModelInfo(`Loading ${parsedQR.fileName}...`);
        
        // Load model dynamically
        const loadedModel = await pureDynamicLoader.loadFromQR(modelData);
        
        // Apply default positioning
        loadedModel.scale.setScalar(1.0);
        loadedModel.position.set(0, -0.4, 0);
        loadedModel.rotation.set(0, 0, 0);
        
        modelRef.current = loadedModel;
        scene.add(loadedModel);
        
        // Store original scale for animation
        (loadedModel as any).originalScale = loadedModel.scale.x;
        console.log(`📏 Model loaded with scale: ${loadedModel.scale.x.toFixed(3)}`);
        
        setLoadingProgress(90);
        setModelInfo(`✅ ${parsedQR.fileName} loaded successfully!`);
        
        console.log(`✅ Model loaded: ${parsedQR.modelId}`); // Chỉ giữ log quan trọng
        // console.log('📊 Model metadata:', { // Giảm log
        //   modelId: (loadedModel as any).modelId,
        //   fileName: (loadedModel as any).fileName,
        //   sourceUrl: (loadedModel as any).sourceUrl,
        //   isDynamic: (loadedModel as any).isDynamic,
        //   isFallback: (loadedModel as any).isFallback
        // });
        
      } catch (error) {
        console.error('❌ Error loading model:', error);
        setModelInfo(`❌ Failed to load model`);
        
        // Create fallback
        try {
          const parsedQR = pureDynamicLoader.parseQRCode(modelData);
          if (parsedQR) {
            const fallbackModel = pureDynamicLoader.createFallback(parsedQR);
            fallbackModel.position.set(0, -0.4, 0);
            modelRef.current = fallbackModel;
            scene.add(fallbackModel);
            setModelInfo(`⚠️ Using fallback for ${parsedQR.fileName}`);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback creation failed:', fallbackError);
        }
      }
      
      setLoadingProgress(100);
      setIsLoading(false);

      // Optimized animation loop (reduce GL calls)
      const animate = () => {
        timeoutRef.current = setTimeout(animate, 1000 / 30); // 30 FPS

        if (modelRef.current && modelRef.current.visible) {
          // Minimal animation to reduce GL spam
          const time = Date.now() * 0.0003; // Much slower
          
          if (!(modelRef.current as any).isFallback) {
            // Better breathing animation - preserve original scale
            const originalScale = (modelRef.current as any).originalScale || modelRef.current.scale.x || 0.2;
            const breathingFactor = 1 + Math.sin(time) * 0.02; // More visible effect
            modelRef.current.scale.setScalar(originalScale * breathingFactor);
          } else {
            // Slow rotation for fallback
            modelRef.current.rotation.y += 0.003;
          }
        }

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();

    } catch (error) {
      console.error('❌ Error creating 3D context:', error);
      setIsLoading(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <CameraView style={styles.camera} />
      
      <View style={styles.glContainer}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          minDist={10}
        >
          <GLView
            style={styles.glView}
            onContextCreate={onContextCreate}
          />
        </PanGestureHandler>
      </View>

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>{modelInfo}</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${loadingProgress}%` }]} />
            </View>
            
            <Text style={styles.progressText}>{loadingProgress}%</Text>
            <Text style={styles.systemInfo}>🎮 Pure Dynamic AR System</Text>
          </View>
        </View>
      )}

      {/* UI Controls */}
      <View style={styles.overlay}>
        <Text style={styles.instruction}>
          {config.title}
        </Text>
        <Text style={styles.subInstruction}>
          {config.subtitle}
        </Text>

        {/* Debug Controls */}
        <View style={styles.debugControls}>
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={toggleDebugInfo}
          >
            <Text style={styles.debugText}>{config.debugLabel}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearCache}
          >
            <Text style={styles.clearText}>{config.clearLabel}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.reloadButton}
            onPress={reloadModel}
          >
            <Text style={styles.reloadText}>{config.reloadLabel}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeText}>{config.closeLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Panel */}
      {showDebugInfo && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>🔧 Pure Dynamic Debug Info</Text>
          
          <View style={styles.debugInfo}>
            <Text style={styles.debugLabel}>Model ID: {debugData.modelId}</Text>
            <Text style={styles.debugLabel}>File Name: {debugData.fileName}</Text>
            <Text style={styles.debugLabel}>Source URL: {debugData.sourceUrl}</Text>
            <Text style={styles.debugLabel}>Is Dynamic: {debugData.isDynamic ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugLabel}>Is Fallback: {debugData.isFallback ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugLabel}>Loaded At: {debugData.loadedAt}</Text>
            <Text style={styles.debugLabel}>Position: ({debugData.position?.x}, {debugData.position?.y}, {debugData.position?.z})</Text>
            <Text style={styles.debugLabel}>Rotation: ({debugData.rotation?.x}, {debugData.rotation?.y}, {debugData.rotation?.z})</Text>
            <Text style={styles.debugLabel}>Scale: {debugData.scale}</Text>
            <Text style={styles.debugLabel}>Children: {debugData.children}</Text>
            <Text style={styles.debugLabel}>Cache Size: {debugData.cacheInfo?.cacheSize || 0}</Text>
            <Text style={styles.debugLabel}>Repositories: {debugData.cacheInfo?.repositories?.length || 0}</Text>
          </View>
        </View>
      )}
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
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: 'rgba(0,0,0,0.2)', // Simple background instead of gradient
  },
  instruction: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  subInstruction: {
    color: '#FFD700',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  debugControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 10,
  },
  debugButton: {
    backgroundColor: 'rgba(0, 150, 255, 0.9)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#0096FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  debugText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  clearButton: {
    backgroundColor: 'rgba(255, 100, 0, 0.9)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#FF6400',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  clearText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  reloadButton: {
    backgroundColor: 'rgba(50, 200, 50, 0.9)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#32C832',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  reloadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    backgroundColor: 'rgba(255,0,0,0.9)',
    paddingHorizontal: 35,
    paddingVertical: 18,
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  debugPanel: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 10,
    padding: 15,
    maxHeight: 400,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  debugInfo: {
    marginBottom: 15,
  },
  debugLabel: {
    color: '#fff',
    fontSize: 11,
    marginBottom: 3,
    fontFamily: 'monospace',
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
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 35,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
    borderWidth: 2,
    borderColor: 'rgba(0,150,255,0.3)',
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
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  systemInfo: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default PureARViewer;
