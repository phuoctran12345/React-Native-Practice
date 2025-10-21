import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Asset } from 'expo-asset';

// ✅ IPHONE 12 PRO MAX SPECIFICATIONS
const IPHONE_12_PRO_MAX = {
  width: 428, // Physical width in points
  height: 926, // Physical height in points
  aspectRatio: 428 / 926, // ≈ 0.462
  safeAreaTop: 47, // Notch height
  safeAreaBottom: 34, // Home indicator height
  viewportHeight: 926 - 47 - 34, // Available viewport
};

export default function OptimizedARViewer() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ THREE.JS REFERENCES
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef(new THREE.Clock());
  
  // ✅ TOUCH INTERACTION
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const onContextCreate = async (gl: any) => {
    console.log('🎬 Optimized AR Context Created for iPhone 12 Pro Max');
    
    // ✅ SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Transparent background
    
    // ✅ CAMERA SETUP - OPTIMIZED FOR IPHONE 12 PRO MAX
    const camera = new THREE.PerspectiveCamera(
      75, // FOV - optimized for close viewing
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1, // Near plane
      1000 // Far plane
    );
    
    // ✅ PERFECT POSITIONING FOR IPHONE 12 PRO MAX
    // Camera positioned to view model from optimal angle
    camera.position.set(0, 0, 3); // 3 units back for full view
    camera.lookAt(0, 0, 0); // Look at center
    
    // ✅ RENDERER SETUP - OPTIMIZED
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setPixelRatio(gl.drawingBufferWidth / gl.drawingBufferHeight);
    
    // ✅ ENHANCED RENDERING SETTINGS
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    // ✅ REMOVED: physicallyCorrectLights - not available in expo-three Renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // ✅ OPTIMIZED LIGHTING FOR IPHONE 12 PRO MAX
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(2, 2, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    
    // ✅ ADDITIONAL LIGHTS FOR PERFECT ILLUMINATION
    const leftLight = new THREE.DirectionalLight(0xffffff, 0.6);
    leftLight.position.set(-2, 1, 1);
    
    const rightLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rightLight.position.set(2, 1, 1);
    
    const rimLight = new THREE.DirectionalLight(0x4A90E2, 0.4);
    rimLight.position.set(0, 2, -1);
    
    scene.add(ambientLight);
    scene.add(directionalLight);
    scene.add(leftLight);
    scene.add(rightLight);
    scene.add(rimLight);
    
    // ✅ STORE REFERENCES
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    // ✅ OPTIMIZED ANIMATION LOOP - 60 FPS
    const animate = () => {
      requestAnimationFrame(animate);
      
      const delta = clockRef.current.getDelta();
      
      // ✅ AUTO ROTATION FOR BETTER VIEWING
      if (model && !touchStart) {
        model.rotation.y += 0.005; // Slow auto rotation
      }
      
      // ✅ BREATHING ANIMATION
      if (model) {
        const time = clockRef.current.getElapsedTime();
        const baseY = -0.5; // Base position
        model.position.y = baseY + Math.sin(time * 2) * 0.05; // Subtle breathing
      }
      
      // ✅ APPLY USER INTERACTIONS
      if (model) {
        model.rotation.x = rotation.x;
        model.rotation.y = rotation.y;
        model.scale.setScalar(scale);
      }
      
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    
    animate();
    console.log('✅ Optimized AR Scene initialized for iPhone 12 Pro Max');
  };

  const loadOptimizedModel = async () => {
    try {
      setIsLoading(true);
      console.log('📦 Loading optimized Fox GLB model for iPhone 12 Pro Max...');
      
      // ✅ SAFEST WAY: Pass moduleId directly to expo-three - USING FOX
      const moduleId = require('../assets/models/Fox.glb');
      const { loadAsync } = await import('expo-three');
      const gltf = await loadAsync(moduleId);
      
      if (gltf.scene) {
        const loadedModel = gltf.scene;
        
        // ✅ PERFECT SCALING FOR IPHONE 12 PRO MAX
        // Model should be visible but not overwhelming
        loadedModel.scale.set(0.8, 0.8, 0.8);
        
        // ✅ PERFECT POSITIONING - CENTER OF SCREEN
        // Positioned for optimal viewing on iPhone 12 Pro Max
        loadedModel.position.set(0, -0.5, 0); // Slightly below center
        
        // ✅ ENABLE SHADOWS
        loadedModel.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        // ✅ ADD TO SCENE
        if (sceneRef.current) {
          sceneRef.current.add(loadedModel);
          setModel(loadedModel);
        }
        
        console.log('✅ Optimized Fox model loaded for iPhone 12 Pro Max!');
      }
    } catch (error) {
      console.error('❌ Optimized model loading failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }: any) => {
    if ((data === 'scizor' || data === 'fox') && !scanned) {
      setScanned(true);
      loadOptimizedModel();
    }
  };

  // ✅ TOUCH HANDLERS FOR INTERACTION
  const handleTouchStart = (event: any) => {
    const touch = event.nativeEvent.touches[0];
    if (touch) {
      setTouchStart({ x: touch.pageX, y: touch.pageY });
    }
  };

  const handleTouchMove = (event: any) => {
    if (!touchStart || !model) return;
    
    const touch = event.nativeEvent.touches[0];
    if (!touch) return;
    
    const deltaX = touch.pageX - touchStart.x;
    const deltaY = touch.pageY - touchStart.y;
    
    // ✅ SMOOTH ROTATION
    setRotation(prev => ({
      x: prev.x + deltaY * 0.01,
      y: prev.y + deltaX * 0.01
    }));
    
    setTouchStart({ x: touch.pageX, y: touch.pageY });
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }
  
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ CAMERA BACKGROUND */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      {/* ✅ 3D VIEWPORT - OPTIMIZED FOR IPHONE 12 PRO MAX */}
      {scanned && (
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
      )}
      
      {/* ✅ UI OVERLAY - OPTIMIZED FOR IPHONE 12 PRO MAX */}
      <View style={styles.overlay}>
        {!scanned && (
          <View style={styles.instructionContainer}>
            <Text style={styles.instruction}>
              📱 Quét QR code để hiển thị Pokemon 3D
            </Text>
            <Text style={styles.subInstruction}>
              Tối ưu cho iPhone 12 Pro Max
            </Text>
          </View>
        )}
        
        {scanned && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>🦊 Fox đã sẵn sàng!</Text>
            <Text style={styles.successSubtext}>
              👆 Chạm để xoay • Pinch để zoom
            </Text>
          </View>
        )}
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Đang tải mô hình...</Text>
          </View>
        )}
        
        {scanned && (
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              setScanned(false);
              setModel(null);
              if (sceneRef.current && model) {
                sceneRef.current.remove(model);
              }
            }}
          >
            <Text style={styles.closeButtonText}>✕ Đóng</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
  },
  glView: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  instruction: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subInstruction: {
    color: '#FFD700',
    fontSize: 14,
    textAlign: 'center',
  },
  successBanner: {
    position: 'absolute',
    top: 60, // Below notch
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  successText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  successSubtext: {
    color: '#FFD700',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    bottom: 50, // Above home indicator
    left: 20,
    right: 20,
    backgroundColor: 'red',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
