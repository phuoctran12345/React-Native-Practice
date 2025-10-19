import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { glbLoader, GLBModelConfig } from '../utils/DynamicGLBLoader';
import { dynamic3DLoader, Dynamic3DConfig } from '../utils/Dynamic3DLoader';
import { getGLBModelFromQRData, getModelFromQRData } from '../utils/modelData';

interface ARViewerProps {
  modelUrl: string; // QR data hoặc model ID
  onClose: () => void;
}

const ARViewer: React.FC<ARViewerProps> = ({ modelUrl, onClose }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelInfo, setModelInfo] = useState<string>('');
  const [showDebugControls, setShowDebugControls] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });

  // Debug functions
  const toggleDebugControls = () => {
    setShowDebugControls(!showDebugControls);
    if (!showDebugControls) {
      updateDebugInfo();
    }
  };

  const updateDebugInfo = () => {
    if (modelRef.current) {
      const info = {
        modelType: (modelRef.current as any).modelType || 'unknown',
        isFallback: (modelRef.current as any).isFallback || false,
        source: (modelRef.current as any).source || 'unknown',
        fileName: (modelRef.current as any).fileName || 'unknown',
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
        cacheInfo: dynamic3DLoader.getCacheInfo()
      };
      setDebugInfo(info);
    }
  };

  const clearCache = () => {
    glbLoader.clearCache();
    dynamic3DLoader.clearCache();
    setModelInfo('🗑️ Cache đã được xóa');
    updateDebugInfo();
  };

  const reloadModel = () => {
    setModelInfo('🔄 Đang reload model...');
    setIsLoading(true);
    setLoadingProgress(0);
    
    // Clear current model
    if (modelRef.current) {
      modelRef.current = null;
    }
    
    // Reload after delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const resetServer = () => {
    Alert.alert(
      '🔄 Reset Server',
      'Bạn có muốn reset server và reload model không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            console.log('🔄 Resetting server...');
            setModelInfo('🔄 Đang reset server...');
            setIsLoading(true);
            setLoadingProgress(0);
            
            // Clear cache
            glbLoader.clearCache();
            dynamic3DLoader.clearCache();
            
            // Reload model
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }
      ]
    );
  };

  // Gesture handler mượt mà hơn cho vuốt trái/phải
  const onGestureEvent = (event: any) => {
    if (modelRef.current) {
      const { translationX, velocityX } = event.nativeEvent;
      const rotationSpeed = 0.008; // Giảm tốc độ để mượt hơn
      
      // Vuốt trái/phải để xoay model theo trục Y với easing
      const targetRotation = rotationRef.current.y + translationX * rotationSpeed;
      modelRef.current.rotation.y = THREE.MathUtils.lerp(
        modelRef.current.rotation.y, 
        targetRotation, 
        0.1 // Smooth interpolation
      );
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      // Lưu rotation hiện tại với momentum
      if (modelRef.current) {
        const { velocityX } = event.nativeEvent;
        const momentum = velocityX * 0.001; // Tạo momentum nhẹ
        rotationRef.current.y = modelRef.current.rotation.y + momentum;
      }
    }
  };

  useEffect(() => {
    requestCameraPermission();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  // Function tạo cube mẫu khi có lỗi
  const createErrorCube = (scene: THREE.Scene) => {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xFF0000,
      wireframe: true,
    });
    const cube = new THREE.Mesh(geometry, material);
    modelRef.current = cube;
    scene.add(cube);

    // Thêm viền cho cube
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    cube.add(wireframe);
  };

  const onContextCreate = async (gl: any) => {
    try {
      // Thiết lập Scene, Camera, Renderer
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0); // Trong suốt

      // Đặt camera
      camera.position.z = 5;

      // Thêm ánh sáng đẹp hơn cho Pikachu
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Ánh sáng xung quanh
      scene.add(ambientLight);

      // Ánh sáng chính từ trên xuống
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7.5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Ánh sáng phụ từ bên trái (màu vàng nhẹ)
      const leftLight = new THREE.DirectionalLight(0xffffaa, 0.4);
      leftLight.position.set(-5, 5, 5);
      scene.add(leftLight);

      // Ánh sáng rim light từ phía sau (tạo viền sáng)
      const rimLight = new THREE.DirectionalLight(0xaaaaff, 0.3);
      rimLight.position.set(0, 2, -8);
      scene.add(rimLight);

      // Load model bằng Dynamic GLB System
      try {
        console.log('🚀 Starting Dynamic GLB Loading System...');
        setLoadingProgress(10);
        setModelInfo('Đang phân tích QR data...');
        
        // Parse QR data để lấy model config
        const glbConfig = getGLBModelFromQRData(modelUrl);
        const legacyConfig = getModelFromQRData(modelUrl);
        
        if (glbConfig) {
          // Sử dụng Dynamic 3D System - hoàn toàn dynamic
          console.log(`🎮 Loading dynamic model: ${glbConfig.name}`);
          setModelInfo(`Đang tải ${glbConfig.name}...`);
          setLoadingProgress(30);
          
          try {
            // Convert GLB config to Dynamic 3D config
            const dynamicConfig: Dynamic3DConfig = {
              id: glbConfig.id,
              name: glbConfig.name,
              fileName: glbConfig.filePath.split('/').pop() || 'model.glb', // Extract file name
              scale: glbConfig.scale,
              position: glbConfig.position,
              rotation: glbConfig.rotation,
              animations: glbConfig.animations
            };
            
            // Load model hoàn toàn dynamic
            const loadedModel = await dynamic3DLoader.loadModel(dynamicConfig);
            
            // Apply config settings
            if (glbConfig.scale) {
              loadedModel.scale.setScalar(glbConfig.scale);
            }
            
            if (glbConfig.position) {
              loadedModel.position.set(
                glbConfig.position.x,
                glbConfig.position.y,
                glbConfig.position.z
              );
            }
            
            if (glbConfig.rotation) {
              loadedModel.rotation.set(
                glbConfig.rotation.x,
                glbConfig.rotation.y,
                glbConfig.rotation.z
              );
            }
            
            modelRef.current = loadedModel;
            scene.add(loadedModel);
            
            // Store original scale for animation
            (loadedModel as any).originalScale = glbConfig.scale || 1;
            
            // Add animation cho model thật
            if (!(loadedModel as any).isFallback) {
              console.log('🎬 Adding animations to real model...');
              // Breathing animation
              const breathingAnimation = () => {
                if (loadedModel && !(loadedModel as any).isFallback) {
                  const time = Date.now() * 0.001;
                  const originalScale = (loadedModel as any).originalScale || 1;
                  loadedModel.scale.setScalar(originalScale + Math.sin(time * 2) * 0.05);
                }
              };
              
              // Store animation function
              (loadedModel as any).animate = breathingAnimation;
            }
            
            setLoadingProgress(90);
            setModelInfo(`✅ ${glbConfig.name} đã tải thành công!`);
            
            console.log(`✅ Dynamic model loaded: ${glbConfig.name}`);
            console.log('📊 Dynamic model info:', {
              isHardcoded: (loadedModel as any).isHardcoded || false,
              modelType: (loadedModel as any).modelType || glbConfig.id,
              isFallback: (loadedModel as any).isFallback || false,
              source: (loadedModel as any).source || 'unknown',
              fileName: (loadedModel as any).fileName || 'unknown',
              scale: glbConfig.scale,
              position: glbConfig.position,
            });
            
          } catch (glbError) {
            console.error(`❌ GLB loading failed for ${glbConfig.name}:`, glbError);
            setModelInfo(`❌ Không tìm thấy file .glb cho ${glbConfig.name}`);
            
            // KHÔNG CÓ FALLBACK - CHỈ HIỂN thị LỖI
            const errorGeometry = new THREE.BoxGeometry(2, 2, 2);
            const errorMaterial = new THREE.MeshStandardMaterial({ 
              color: 0xFF0000,
              wireframe: true,
            });
            const errorCube = new THREE.Mesh(errorGeometry, errorMaterial);
            
            // Thêm text "FILE NOT FOUND"
            modelRef.current = errorCube;
            scene.add(errorCube);
            
            console.log(`❌ No .glb file available for: ${glbConfig.name}`);
          }
          
        } else {
          // Không tìm thấy model
          console.warn('⚠️ Unknown model ID');
          setModelInfo('⚠️ Model không tồn tại');
          
          const unknownGeometry = new THREE.BoxGeometry(2, 2, 2);
          const unknownMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            wireframe: true,
          });
          const unknownCube = new THREE.Mesh(unknownGeometry, unknownMaterial);
          
          modelRef.current = unknownCube;
          scene.add(unknownCube);
        }
        
        setLoadingProgress(100);
        setIsLoading(false);
        
      } catch (error) {
        // Ultimate fallback
        console.error('❌ Error in Dynamic GLB System:', error);
        setModelInfo('❌ Lỗi tải model');
        
        createErrorCube(scene);
        setIsLoading(false);
      }

      setIsLoading(false);

      // Animation loop với hiệu ứng đẹp
      const animate = () => {
        timeoutRef.current = setTimeout(animate, 1000 / 60); // 60 FPS

        // Animation cho model thật hoặc fallback
        if (modelRef.current) {
          const time = Date.now() * 0.001; // Time in seconds
          
          // Sử dụng animation từ model nếu có
          if ((modelRef.current as any).animate) {
            (modelRef.current as any).animate();
          } else {
            // Fallback animation cho model không có animation
            if ((modelRef.current as any).isFallback) {
              // Animation cho fallback cube
              modelRef.current.rotation.y += 0.01;
              modelRef.current.rotation.x += 0.005;
            } else {
              // Breathing animation cho model thật
              const originalScale = (modelRef.current as any).originalScale || 1;
              modelRef.current.scale.setScalar(originalScale + Math.sin(time * 2) * 0.05);
            }
          }
        }

        // Render scene
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();

    } catch (error) {
      console.error('Error creating 3D context:', error);
      setIsLoading(false);
    }
  };

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

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Camera làm background */}
      <CameraView style={styles.camera} facing="back" />

      {/* Overlay 3D với Gesture Handler - Absolute positioned */}
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

      {/* Loading Overlay với Progress */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>{modelInfo}</Text>
            
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${loadingProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{loadingProgress}%</Text>
            
            {/* GLB System Info */}
            <Text style={styles.systemInfo}>🚀 Dynamic GLB Loading System</Text>
          </View>
        </View>
      )}

      {/* UI Controls */}
      <View style={styles.overlay}>
        <Text style={styles.instruction}>
          📱 Model 3D đang hiển thị trên camera
        </Text>
        <Text style={styles.subInstruction}>
          👆 Vuốt trái/phải để xoay model • Di chuyển điện thoại để xem từ các góc độ khác
        </Text>

        {/* Debug Controls */}
        <View style={styles.debugControls}>
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={toggleDebugControls}
          >
            <Text style={styles.debugText}>🔧 Debug</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetServer}
          >
            <Text style={styles.resetText}>🔄 Reset</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeText}>❌ Đóng</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Panel */}
      {showDebugControls && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>🔧 Dynamic Debug Information</Text>
          
          <View style={styles.debugInfo}>
            <Text style={styles.debugLabel}>Model Type: {debugInfo.modelType}</Text>
            <Text style={styles.debugLabel}>Source: {debugInfo.source}</Text>
            <Text style={styles.debugLabel}>File Name: {debugInfo.fileName || 'unknown'}</Text>
            <Text style={styles.debugLabel}>Is Fallback: {debugInfo.isFallback ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugLabel}>Position: ({debugInfo.position?.x}, {debugInfo.position?.y}, {debugInfo.position?.z})</Text>
            <Text style={styles.debugLabel}>Rotation: ({debugInfo.rotation?.x}, {debugInfo.rotation?.y}, {debugInfo.rotation?.z})</Text>
            <Text style={styles.debugLabel}>Scale: {debugInfo.scale}</Text>
            <Text style={styles.debugLabel}>Children: {debugInfo.children}</Text>
            <Text style={styles.debugLabel}>Cache Size: {debugInfo.cacheInfo?.cacheSize || 0}</Text>
            <Text style={styles.debugLabel}>Base URLs: {debugInfo.cacheInfo?.baseUrls?.length || 0}</Text>
          </View>

          <View style={styles.debugActions}>
            <TouchableOpacity style={styles.actionButton} onPress={clearCache}>
              <Text style={styles.actionText}>🗑️ Clear Cache</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={reloadModel}>
              <Text style={styles.actionText}>🔄 Reload Model</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={updateDebugInfo}>
              <Text style={styles.actionText}>📊 Refresh Info</Text>
            </TouchableOpacity>
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
    pointerEvents: 'box-none', // Cho phép touch events
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
  },
  instruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  subInstruction: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
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
  debugControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 10,
  },
  debugButton: {
    backgroundColor: 'rgba(0, 150, 255, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  debugText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 100, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  debugActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 5,
  },
  actionButton: {
    backgroundColor: 'rgba(50, 150, 50, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    minWidth: 100,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
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

export default ARViewer;
