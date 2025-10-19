import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { glbLoader, GLBModelConfig } from '../utils/DynamicGLBLoader';
import { dynamic3DLoader, Dynamic3DConfig } from '../utils/Dynamic3DLoader';

interface PokemonScizorViewerProps {
  onClose: () => void;
}

const PokemonScizorViewer: React.FC<PokemonScizorViewerProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelInfo, setModelInfo] = useState<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });

  // Gesture handler cho vuốt trái/phải
  const onGestureEvent = (event: any) => {
    if (modelRef.current) {
      const { translationX, velocityX } = event.nativeEvent;
      const rotationSpeed = 0.008;
      
      const targetRotation = rotationRef.current.y + translationX * rotationSpeed;
      modelRef.current.rotation.y = THREE.MathUtils.lerp(
        modelRef.current.rotation.y, 
        targetRotation, 
        0.1
      );
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      if (modelRef.current) {
        const { velocityX } = event.nativeEvent;
        const momentum = velocityX * 0.001;
        rotationRef.current.y = modelRef.current.rotation.y + momentum;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
      renderer.setClearColor(0x87CEEB, 1); // Màu xanh da trời

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

      // Load model Pokemon Scizor từ pokemon_concua
      try {
        console.log('🎮 Loading Pokemon Scizor from pokemon_concua...');
        setLoadingProgress(10);
        setModelInfo('Đang tải Pokemon Scizor...');
        
        // Config cho Scizor từ pokemon_concua
        const scizorConfig: GLBModelConfig = {
          id: 'scizor_concua',
          name: 'Scizor (Pokemon Concua)',
          filePath: 'assets/models/pokemon_concua/pokemon_scizor.glb',
          scale: 1.2,
          position: { x: 0, y: -0.3, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          animations: ['idle', 'attack', 'fly']
        };
        
        setLoadingProgress(30);
        setModelInfo('Đang phân tích file 3D...');
        
        try {
          // Load model bằng GLB Loader
          const loadedModel = await glbLoader.loadModel(scizorConfig);
          
          // Apply config settings
          if (scizorConfig.scale) {
            loadedModel.scale.setScalar(scizorConfig.scale);
          }
          
          if (scizorConfig.position) {
            loadedModel.position.set(
              scizorConfig.position.x,
              scizorConfig.position.y,
              scizorConfig.position.z
            );
          }
          
          if (scizorConfig.rotation) {
            loadedModel.rotation.set(
              scizorConfig.rotation.x,
              scizorConfig.rotation.y,
              scizorConfig.rotation.z
            );
          }
          
          modelRef.current = loadedModel;
          scene.add(loadedModel);
          
          // Store original scale for animation
          (loadedModel as any).originalScale = scizorConfig.scale || 1;
          
          // Add breathing animation
          const breathingAnimation = () => {
            if (loadedModel && !(loadedModel as any).isFallback) {
              const time = Date.now() * 0.001;
              const originalScale = (loadedModel as any).originalScale || 1;
              loadedModel.scale.setScalar(originalScale + Math.sin(time * 2) * 0.05);
            }
          };
          
          (loadedModel as any).animate = breathingAnimation;
          
          setLoadingProgress(90);
          setModelInfo('✅ Pokemon Scizor đã tải thành công!');
          
          console.log('✅ Pokemon Scizor loaded successfully!');
          
        } catch (glbError) {
          console.error('❌ GLB loading failed:', glbError);
          setModelInfo('❌ Không thể tải file .glb');
          
          // Fallback: tạo cube đỏ
          const errorGeometry = new THREE.BoxGeometry(2, 2, 2);
          const errorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF0000,
            wireframe: true,
          });
          const errorCube = new THREE.Mesh(errorGeometry, errorMaterial);
          
          modelRef.current = errorCube;
          scene.add(errorCube);
        }
        
        setLoadingProgress(100);
        setIsLoading(false);
        
      } catch (error) {
        console.error('❌ Error loading Pokemon Scizor:', error);
        setModelInfo('❌ Lỗi tải Pokemon Scizor');
        
        // Ultimate fallback
        const fallbackGeometry = new THREE.BoxGeometry(2, 2, 2);
        const fallbackMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xFF0000,
          wireframe: true,
        });
        const fallbackCube = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        
        modelRef.current = fallbackCube;
        scene.add(fallbackCube);
        setIsLoading(false);
      }

      // Animation loop
      const animate = () => {
        timeoutRef.current = setTimeout(animate, 1000 / 60);

        if (modelRef.current) {
          const time = Date.now() * 0.001;
          
          if ((modelRef.current as any).animate) {
            (modelRef.current as any).animate();
          } else {
            // Fallback animation
            if ((modelRef.current as any).isFallback) {
              modelRef.current.rotation.y += 0.01;
              modelRef.current.rotation.x += 0.005;
            } else {
              const originalScale = (modelRef.current as any).originalScale || 1;
              modelRef.current.scale.setScalar(originalScale + Math.sin(time * 2) * 0.05);
            }
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

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* 3D View với Gesture Handler */}
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
            
            <Text style={styles.systemInfo}>🎮 Pokemon Scizor 3D Viewer</Text>
          </View>
        </View>
      )}

      {/* UI Controls */}
      <View style={styles.overlay}>
        <Text style={styles.instruction}>
          🦂 Pokemon Scizor 3D Model
        </Text>
        <Text style={styles.subInstruction}>
          👆 Vuốt trái/phải để xoay • Di chuyển để xem từ các góc độ khác
        </Text>

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
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
});

export default PokemonScizorViewer;
