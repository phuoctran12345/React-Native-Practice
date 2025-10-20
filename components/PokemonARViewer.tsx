import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, TouchableWithoutFeedback } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { glbLoader, GLBModelConfig } from '../utils/DynamicGLBLoader';
import { threeJSGLTFLoader } from '../utils/ThreeJSGLTFLoader';
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

  // ✅ TOUCH HANDLER CHO XOAY 360 ĐỘ VÀ ZOOM - SỬA LỖI!
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [currentScale, setCurrentScale] = useState<number>(1);
  
  // ✅ HELPER FUNCTION ĐỂ TÍNH KHOẢNG CÁCH GIỮA 2 TOUCH
  const getDistance = (touch1: any, touch2: any) => {
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (event: any) => {
    const touches = event.nativeEvent.touches;
    console.log(`👆 Touch start: ${touches.length} fingers`);
    
    if (touches.length === 1) {
      // Single touch - rotation
      setTouchStart({ x: touches[0].pageX, y: touches[0].pageY });
      console.log(`🔄 Single touch - rotation mode`);
    } else if (touches.length === 2) {
      // Multi touch - zoom
      const distance = getDistance(touches[0], touches[1]);
      setInitialDistance(distance);
      setCurrentScale(1); // Reset scale
      console.log(`🔍 Multi touch - zoom mode, distance: ${distance.toFixed(2)}`);
    }
  };
  
  const handleTouchMove = (event: any) => {
    if (!modelRef.current) return;
    
    const touches = event.nativeEvent.touches;
    
    if (touches.length === 1 && touchStart) {
      // Single touch - rotation
      const touch = touches[0];
      const deltaX = touch.pageX - touchStart.x;
      const deltaY = touch.pageY - touchStart.y;
      const rotationSpeed = 0.008; // ✅ TĂNG TỐC ĐỘ XOAY
      
      // ✅ ĐÁNH DẤU USER ĐANG XOAY
      (modelRef.current as any).isUserRotating = true;
      
      // ✅ XOAY 360 ĐỘ THEO CẢ X VÀ Y - FIX
      modelRef.current.rotation.y += deltaX * rotationSpeed;
      modelRef.current.rotation.x += deltaY * rotationSpeed * 0.3; // Giảm tốc độ xoay dọc
      
      // ✅ GIỚI HẠN ROTATION X ĐỂ KHÔNG BỊ LẬT NGƯỢC
      modelRef.current.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, modelRef.current.rotation.x));
      
      // ✅ CẬP NHẬT TOUCH START ĐỂ XOAY MƯỢT
      setTouchStart({ x: touch.pageX, y: touch.pageY });
      
    } else if (touches.length === 2 && initialDistance) {
      // Multi touch - zoom
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = currentDistance / initialDistance;
      
      // ✅ GIỚI HẠN ZOOM (0.3x đến 2x) - MOBILE FRIENDLY
      const clampedScale = Math.max(0.3, Math.min(2, scale));
      const originalScale = (modelRef.current as any).originalScale || 0.03;
      
      // ✅ SMOOTH SCALING
      const targetScale = originalScale * clampedScale;
      modelRef.current.scale.setScalar(targetScale);
      
      console.log(`🔍 Zoom: ${clampedScale.toFixed(2)}x, Scale: ${targetScale.toFixed(3)}, Distance: ${currentDistance.toFixed(2)}`);
      
      // ✅ CẬP NHẬT DISTANCE LIÊN TỤC
      setInitialDistance(currentDistance);
    }
  };
  
  const handleTouchEnd = () => {
    setTouchStart(null);
    setInitialDistance(null);
    
    // ✅ RESET USER ROTATING FLAG SAU 1 GIÂY
    setTimeout(() => {
      if (modelRef.current) {
        (modelRef.current as any).isUserRotating = false;
      }
    }, 1000);
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
            // console.log(`🔄 Auto rotation resumed`); // ❌ BỚT LOG
          }
        }, 2000);
        
        // console.log(`🚀 Momentum applied: ${momentum}, Final rotation: ${modelRef.current.rotation.y}`); // ❌ BỚT LOG
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
    console.log('📷 Camera permission:', status === 'granted' ? 'GRANTED' : 'DENIED');
  };

  // Tạo fallback model khi load thất bại
  const createFallbackModel = (config: any) => {
    const group = new THREE.Group();
    
    if (config.id.includes('scizor')) {
      // Tạo Scizor-like fallback
      
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
    
    return group;
  };

  // Handle QR Code scan
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    console.log('🎯 QR Code scanned successfully:', data);
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
        console.log('✅ Model config found:', glbConfig.name, 'File:', glbConfig.filePath);
        setModelInfo(`Đang tải ${glbConfig.name}...`);
        setLoadingProgress(30);
        
        try {
          // ✅ SỬ DỤNG THREE.JS GLTFLOADER CHO 100% CHÍNH XÁC
          console.log(`🎯 Using Three.js GLTFLoader for 100% accuracy`);
          setLoadingProgress(40);
          setModelInfo(`Đang tải model ${glbConfig.name}...`);
          
          // ✅ BỎ TIMEOUT CỨNG 15s: tiếp tục chờ và cập nhật trạng thái
          //    Tránh rơi vào fallback do mạng chậm / texture chậm
          setModelInfo(`Đang tải model ${glbConfig.name} (có thể mất 10-20s lần đầu)...`);
          const loadedModel = await threeJSGLTFLoader.loadModel(glbConfig);
          
          // Apply config settings
          if (glbConfig.scale) {
            loadedModel.scale.setScalar(glbConfig.scale);
          }
          
          setLoadingProgress(70);
          setModelInfo(`Đang áp dụng cài đặt...`);
          
          // ✅ FIX: ĐẶT MODEL Ở VỊ TRÍ TỐI ƯU ĐỂ THẤY TOÀN BỘ
          loadedModel.position.set(0, -0.5, 0); // Hạ xuống một chút để thấy đầy đủ
          
          setLoadingProgress(85);
          setModelInfo(`Đang tối ưu materials...`);
          
          // ✅ GIỮ NGUYÊN MÀU SẮC GỐC - CHỈ ĐẢM BẢO MATERIAL HOẠT ĐỘNG
          loadedModel.traverse((child: any) => {
            if (child.isMesh && child.material) {
              // Chỉ đảm bảo material hoạt động, KHÔNG thay đổi màu sắc
              child.material.needsUpdate = true;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
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
            console.log('🎉 Model added to scene successfully!');
          }
          
          // Store original scale for animation
          (loadedModel as any).originalScale = glbConfig.scale || 1;
          
          // ✅ BREATHING ANIMATION - SỬA LỖI!
          const breathingAnimation = () => {
            if (loadedModel && !(loadedModel as any).isFallback) {
              const time = Date.now() * 0.001;
              const originalScale = (loadedModel as any).originalScale || glbConfig.scale || 1;
              const breathingScale = originalScale + Math.sin(time * 2) * 0.15; // ✅ TĂNG BREATHING EFFECT
              loadedModel.scale.setScalar(breathingScale);
            }
          };
          
          (loadedModel as any).animate = breathingAnimation;
          (loadedModel as any).originalScale = glbConfig.scale || 1;
          (loadedModel as any).isUserRotating = false; // ✅ ĐỂ AUTO-ROTATION HOẠT ĐỘNG
          
          setLoadingProgress(95);
          setModelInfo(`Đang thêm vào scene...`);
          
          setLoadingProgress(100);
          setModelInfo(`✅ ${glbConfig.name} đã sẵn sàng!`);
          console.log('🚀 Pokemon model loaded successfully:', glbConfig.name);
          
        } catch (glbError) {
          console.error(`❌ GLB loading failed for ${glbConfig.name}:`, glbError);
          console.error(`❌ Error details:`, {
            message: (glbError as Error).message,
            stack: (glbError as Error).stack,
            config: glbConfig,
            filePath: glbConfig.filePath
          });
          console.error(`❌ Full error object:`, glbError);
          setModelInfo(`❌ Không thể tải ${glbConfig.name}`);
          
          // Tạo fallback model thay vì show error
          const fallbackModel = createFallbackModel(glbConfig);
          modelRef.current = fallbackModel;
          
          if (sceneRef.current) {
            sceneRef.current.add(fallbackModel);
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
        console.log('🔄 Adding existing model to new scene');
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

      // ✅ FIX: ĐẶT CAMERA ĐỂ MODEL LUÔN CHÍNH GIỮA MÀN HÌNH
      camera.position.set(0, 0, 6); // Khoảng cách vừa phải
      camera.lookAt(0, 0, 0); // Nhìn thẳng vào center

      // ✅ ÁNH SÁNG TỐI ƯU CHO TEXTURE GLTF!
      // Ambient light vừa phải để không làm mất chi tiết
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      // Directional light chính - không quá mạnh
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(2, 5, 3);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Ánh sáng từ nhiều góc để hiển thị texture đúng
      const leftLight = new THREE.DirectionalLight(0xffffff, 0.4);
      leftLight.position.set(-3, 2, 2);
      scene.add(leftLight);

      const rightLight = new THREE.DirectionalLight(0xffffff, 0.4);
      rightLight.position.set(3, 2, 2);
      scene.add(rightLight);
      
      // Point light nhẹ để tạo độ sáng tự nhiên
      const pointLight = new THREE.PointLight(0xffffff, 0.3, 50);
      pointLight.position.set(0, 2, 5);
      scene.add(pointLight);

      // ✅ ANIMATION LOOP - TỐI ƯU HIỆU SUẤT!
      const animate = () => {
        timeoutRef.current = setTimeout(animate, 1000 / 30); // ✅ GIẢM TỪ 60 FPS → 30 FPS

        if (modelRef.current) {
          const time = Date.now() * 0.001;
          
          // ✅ BREATHING ANIMATION - TỐI ƯU!
          if ((modelRef.current as any).animate) {
            (modelRef.current as any).animate();
          } else {
            // ✅ GIẢM TÍNH TOÁN - CHỈ KHI CẦN THIẾT
            const originalScale = (modelRef.current as any).originalScale || 1;
            const breathingScale = originalScale + Math.sin(time * 1.5) * 0.05; // ✅ GIẢM FREQUENCY
            modelRef.current.scale.setScalar(breathingScale);
          }
          
          // ✅ TỰ ĐỘNG XOAY - GIẢM TỐC ĐỘ
          if (!(modelRef.current as any).isUserRotating) {
            modelRef.current.rotation.y += 0.01; // ✅ GIẢM TỪ 0.02 → 0.01
          }
          
          // ✅ ĐẢM BẢO MODEL LUÔN TRONG TẦM NHÌN
          const modelPosition = modelRef.current.position;
          const cameraPosition = camera.position;
          const distance = Math.sqrt(
            Math.pow(modelPosition.x - cameraPosition.x, 2) +
            Math.pow(modelPosition.y - cameraPosition.y, 2) +
            Math.pow(modelPosition.z - cameraPosition.z, 2)
          );
          
          // Nếu model quá xa, đưa về gần camera
          if (distance > 5) {
            modelRef.current.position.set(0, 0, 0);
          }
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

      {/* ✅ FIX: TOUCH HANDLER TRỰC TIẾP VỚI GLVIEW */}
      <View 
        style={styles.glContainer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
        {/* ✅ FIX: UI NHẤT QUÁN - THAY ĐỔI THEO TRẠNG THÁI */}
        {!scannedData ? (
          <Text style={styles.instruction}>
            📱 Quét QR code để hiển thị Pokemon 3D
          </Text>
        ) : (
          <Text style={styles.instruction}>
            🦂 {modelInfo || 'Pokemon đã sẵn sàng!'}
          </Text>
        )}
        
        {scannedData && (
          <Text style={styles.subInstruction}>
            👆 Vuốt để xoay 360° • 🤏 Pinch để zoom in/out • 📱 Di chuyển điện thoại để xem từ các góc độ khác
          </Text>
        )}

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
