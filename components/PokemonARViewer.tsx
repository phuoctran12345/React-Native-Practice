import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, TouchableWithoutFeedback } from 'react-native';
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

  // ✅ TOUCH HANDLER CHO XOAY 360 ĐỘ - SỬA LỖI!
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  
  const handleTouchStart = (event: any) => {
    const touch = event.nativeEvent.touches[0];
    setTouchStart({ x: touch.pageX, y: touch.pageY });
  };
  
  const handleTouchMove = (event: any) => {
    if (!touchStart || !modelRef.current) return;
    
    const touch = event.nativeEvent.touches[0];
    const deltaX = touch.pageX - touchStart.x;
    const rotationSpeed = 0.01;
    
    // ✅ ĐÁNH DẤU USER ĐANG XOAY
    (modelRef.current as any).isUserRotating = true;
    
    // ✅ XOAY TRỰC TIẾP THEO TOUCH
    modelRef.current.rotation.y += deltaX * rotationSpeed;
  };
  
  const handleTouchEnd = () => {
    setTouchStart(null);
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
          // Load model bằng Dynamic GLB Loader với fallback
          const loadedModel = await glbLoader.loadModel(glbConfig);
          
          // Apply config settings
          if (glbConfig.scale) {
            loadedModel.scale.setScalar(glbConfig.scale);
          }
          
          // ✅ FIX: ĐẶT MODEL Ở VỊ TRÍ TỐI ƯU ĐỂ THẤY TOÀN BỘ
          loadedModel.position.set(0, -0.5, 0); // Hạ xuống một chút để thấy đầy đủ
          
          // ✅ FIX MATERIAL - ĐẢM BẢO TEXTURE HIỂN THỊ ĐÚNG
          loadedModel.traverse((child: any) => {
            if (child.isMesh && child.material) {
              // Đảm bảo material hoạt động và hiển thị đúng
              child.material.needsUpdate = true;
              child.material.transparent = false;
              child.material.opacity = 1.0;
              
              // Nếu material quá tối, tăng emissive nhẹ
              if (child.material.color) {
                child.material.emissive = new THREE.Color(0x111111);
              }
              
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
              const originalScale = (loadedModel as any).originalScale || 1;
              const breathingScale = originalScale + Math.sin(time * 2) * 0.08; // Tăng breathing effect
              loadedModel.scale.setScalar(breathingScale);
              
              // console.log(`💨 Breathing animation: ${breathingScale.toFixed(3)}`); // ❌ BỚT LOG
            }
          };
          
          (loadedModel as any).animate = breathingAnimation;
          
          setLoadingProgress(90);
          setModelInfo(`✅ ${glbConfig.name} đã tải thành công!`);
          console.log('🚀 Pokemon model loaded successfully:', glbConfig.name);
          
        } catch (glbError) {
          console.error(`❌ GLB loading failed for ${glbConfig.name}:`, glbError);
          console.error(`❌ Error details:`, {
            message: (glbError as Error).message,
            stack: (glbError as Error).stack,
            config: glbConfig
          });
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

      // ✅ FIX: ĐẶT CAMERA ĐỂ MODEL LUÔN TRONG TẦM NHÌN - XA HƠN
      camera.position.set(0, 0, 8); // XA HƠN NỮA để thấy toàn bộ model
      camera.lookAt(0, -0.3, 0); // Nhìn vào vị trí model

      // ✅ ÁNH SÁNG MẠNH HƠN - SỬA LỖI MODEL ĐEN!
      // Ambient light mạnh hơn để đảm bảo model không bị đen
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      // Directional light chính từ trên xuống - MẠNH HƠN
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
      directionalLight.position.set(0, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Ánh sáng phụ từ bên trái - MẠNH HƠN
      const leftLight = new THREE.DirectionalLight(0xffffff, 0.8);
      leftLight.position.set(-5, 5, 5);
      scene.add(leftLight);

      // Ánh sáng phụ từ bên phải - MẠNH HƠN
      const rightLight = new THREE.DirectionalLight(0xffffff, 0.8);
      rightLight.position.set(5, 5, 5);
      scene.add(rightLight);
      
      // Thêm point light để chiếu sáng toàn diện
      const pointLight = new THREE.PointLight(0xffffff, 1.0, 100);
      pointLight.position.set(0, 0, 10);
      scene.add(pointLight);

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
            modelRef.current.rotation.y += 0.02; // Tăng tốc độ auto rotation
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
            👆 Vuốt trái/phải để xoay Pokemon • Di chuyển điện thoại để xem từ các góc độ khác
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
