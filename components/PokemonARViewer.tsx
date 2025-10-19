import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { glbLoader, GLBModelConfig } from '../utils/DynamicGLBLoader';
import { getGLBModelFromQRData } from '../utils/modelData';

interface PokemonARViewerProps {
  onClose: () => void;
}

const PokemonARViewer: React.FC<PokemonARViewerProps> = ({ onClose }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelInfo, setModelInfo] = useState<string>('');
  const [showDebugControls, setShowDebugControls] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);

  // ✅ GESTURE HANDLER CHO XOAY 360 ĐỘ - SỬA LỖI!
  const onGestureEvent = (event: any) => {
    if (modelRef.current) {
      const { translationX } = event.nativeEvent;
      const rotationSpeed = 0.01; // Tăng tốc độ xoay
      
      // ✅ ĐÁNH DẤU USER ĐANG XOAY
      (modelRef.current as any).isUserRotating = true;
      
      // ✅ XOAY TRỰC TIẾP THEO GESTURE
      modelRef.current.rotation.y += translationX * rotationSpeed;
      
      console.log(`🔄 Model rotation Y: ${modelRef.current.rotation.y}`);
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      if (modelRef.current) {
        const { velocityX } = event.nativeEvent;
        const momentum = velocityX * 0.002; // Tăng momentum
        
        // ✅ THÊM MOMENTUM SAU KHI THẢ TAY
        modelRef.current.rotation.y += momentum;
        
        // ✅ RESET FLAG SAU 2 GIÂY
        setTimeout(() => {
          if (modelRef.current) {
            (modelRef.current as any).isUserRotating = false;
            console.log(`🔄 Auto rotation resumed`);
          }
        }, 2000);
        
        console.log(`🚀 Momentum applied: ${momentum}, Final rotation: ${modelRef.current.rotation.y}`);
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

  // Tạo fallback model khi load thất bại
  const createFallbackModel = (config: any) => {
    console.log(`🔄 Creating fallback model for ${config.name}`);
    
    const group = new THREE.Group();
    
    if (config.id.includes('scizor')) {
      // Tạo Scizor-like fallback
      console.log(`🦂 Creating Scizor-like fallback`);
      
      // Body (màu đỏ)
      const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xCC0000 });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0;
      group.add(body);
      
      // Head (màu đỏ đậm)
      const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({ color: 0x990000 });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 0.6;
      group.add(head);
      
      // Arms/Claws (màu bạc)
      const armGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
      const armMaterial = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
      
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-0.4, 0.2, 0);
      group.add(leftArm);
      
      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(0.4, 0.2, 0);
      group.add(rightArm);
      
    } else {
      // Generic Pokemon fallback
      const geometry = new THREE.SphereGeometry(0.5, 8, 8);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xFFD700,
        wireframe: true
      });
      const sphere = new THREE.Mesh(geometry, material);
      group.add(sphere);
    }
    
    // Add metadata
    (group as any).modelType = config.id;
    (group as any).isFallback = true;
    (group as any).source = 'pokemon-fallback';
    (group as any).originalScale = config.scale || 1;
    
    console.log(`✅ Fallback model created for: ${config.name}`);
    return group;
  };

  // Handle QR Code scan
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    console.log('🔍 QR Code scanned:', data);
    setScannedData(data);
    loadPokemonModel(data);
  };

  // Load Pokemon model từ QR data
  const loadPokemonModel = async (qrData: string) => {
    try {
      setIsLoading(true);
      setLoadingProgress(10);
      setModelInfo('Đang phân tích QR code...');
      
      // Parse QR data để lấy model config
      const glbConfig = getGLBModelFromQRData(qrData);
      
      if (glbConfig) {
        console.log(`🎮 Loading Pokemon model: ${glbConfig.name}`);
        setModelInfo(`Đang tải ${glbConfig.name}...`);
        setLoadingProgress(30);
        
        try {
          // Load model bằng Dynamic GLB Loader với fallback
          const loadedModel = await glbLoader.loadModel(glbConfig);
          
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
          
          // ✅ ADD MODEL VÀO SCENE - QUAN TRỌNG!
          if (sceneRef.current) {
            sceneRef.current.add(loadedModel);
            console.log(`✅ Model added to scene successfully!`);
            console.log(`📊 Model position:`, {
              x: loadedModel.position.x,
              y: loadedModel.position.y,
              z: loadedModel.position.z
            });
            console.log(`📊 Model scale:`, loadedModel.scale.x);
            console.log(`📊 Model rotation:`, {
              x: loadedModel.rotation.x,
              y: loadedModel.rotation.y,
              z: loadedModel.rotation.z
            });
          } else {
            console.log(`❌ Scene not available yet, model will be added later`);
          }
          
          // Store original scale for animation
          (loadedModel as any).originalScale = glbConfig.scale || 1;
          
          // ✅ BREATHING ANIMATION - SỬA LỖI!
          const breathingAnimation = () => {
            if (loadedModel && !(loadedModel as any).isFallback) {
              const time = Date.now() * 0.001;
              const originalScale = (loadedModel as any).originalScale || 1;
              const breathingScale = originalScale + Math.sin(time * 2) * 0.08; // Tăng breathing effect
              loadedModel.scale.setScalar(breathingScale);
              
              console.log(`💨 Breathing animation: ${breathingScale.toFixed(3)}`);
            }
          };
          
          (loadedModel as any).animate = breathingAnimation;
          
          setLoadingProgress(90);
          setModelInfo(`✅ ${glbConfig.name} đã tải thành công!`);
          
          console.log(`✅ Pokemon model loaded: ${glbConfig.name}`);
          
        } catch (glbError) {
          console.error(`❌ GLB loading failed for ${glbConfig.name}:`, glbError);
          setModelInfo(`❌ Không thể tải ${glbConfig.name}`);
          
          // Tạo fallback model thay vì show error
          console.log(`🔄 Creating fallback model for ${glbConfig.name}`);
          const fallbackModel = createFallbackModel(glbConfig);
          modelRef.current = fallbackModel;
          
          if (sceneRef.current) {
            sceneRef.current.add(fallbackModel);
            console.log(`✅ Fallback model added to scene`);
          }
          
          setLoadingProgress(90);
          setModelInfo(`⚠️ ${glbConfig.name} - Sử dụng fallback model`);
        }
        
        setLoadingProgress(100);
        setIsLoading(false);
        
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
      
      Alert.alert(
        '❌ Lỗi hệ thống',
        'Có lỗi xảy ra khi tải Pokemon model. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
      
      setIsLoading(false);
    }
  };

  const onContextCreate = async (gl: any) => {
    try {
      // Thiết lập Scene, Camera, Renderer
      const scene = new THREE.Scene();
      sceneRef.current = scene; // Lưu scene reference
      
      // ✅ Nếu model đã được load trước đó, add vào scene ngay
      if (modelRef.current) {
        scene.add(modelRef.current);
        console.log(`✅ Adding existing model to new scene`);
      }
      
      const camera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0); // Trong suốt để thấy camera

      // Đặt camera
      camera.position.z = 5;

      // Thêm ánh sáng đẹp cho Pokemon
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7.5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Ánh sáng phụ màu đỏ cho Scizor
      const redLight = new THREE.DirectionalLight(0xff4444, 0.3);
      redLight.position.set(-5, 5, 5);
      scene.add(redLight);

      // Ánh sáng rim light
      const rimLight = new THREE.DirectionalLight(0xaaaaff, 0.3);
      rimLight.position.set(0, 2, -8);
      scene.add(rimLight);

      // ✅ ANIMATION LOOP - CẢI THIỆN!
      const animate = () => {
        timeoutRef.current = setTimeout(animate, 1000 / 60);

        if (modelRef.current) {
          const time = Date.now() * 0.001;
          
          // ✅ BREATHING ANIMATION CHO TẤT CẢ MODEL
          if ((modelRef.current as any).animate) {
            (modelRef.current as any).animate();
          } else {
            // Fallback breathing animation
            const originalScale = (modelRef.current as any).originalScale || 1;
            const breathingScale = originalScale + Math.sin(time * 2) * 0.08;
            modelRef.current.scale.setScalar(breathingScale);
          }
          
          // ✅ TỰ ĐỘNG XOAY CHẬM (OPTIONAL)
          if (!(modelRef.current as any).isUserRotating) {
            modelRef.current.rotation.y += 0.005; // Tự động xoay chậm
          }
        }

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
      <CameraView 
        style={styles.camera} 
        facing="back"
        onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'pdf417'],
        }}
      />

      {/* Overlay 3D với Gesture Handler */}
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
        <Text style={styles.instruction}>
          📱 Quét QR code để hiển thị Pokemon 3D
        </Text>
        <Text style={styles.subInstruction}>
          👆 Vuốt trái/phải để xoay Pokemon • Di chuyển điện thoại để xem từ các góc độ khác
        </Text>

        {scannedData && (
          <Text style={styles.scannedData}>
            🔍 Đã quét: {scannedData}
          </Text>
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

export default PokemonARViewer;
