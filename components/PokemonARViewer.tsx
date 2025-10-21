import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, TouchableWithoutFeedback, Dimensions, Platform } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { getGLBModelFromQRData, getGLBModelConfig } from '../utils/modelData';

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
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState<string>('idle');
  const [animationFeedback, setAnimationFeedback] = useState<string>('');

  // ✅ TOUCH HANDLER CHO XOAY 360 ĐỘ VÀ ZOOM - SỬA LỖI!
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [currentScale, setCurrentScale] = useState<number>(1);
  
  // ✅ TC3.2: SWIPE GESTURE TRACKING
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [isSwipeGesture, setIsSwipeGesture] = useState(false);
  
  // ✅ TC6.2: SCREEN COMPATIBILITY
  const screenData = Dimensions.get('window');
  const isIOS = Platform.OS === 'ios';
  const hasNotch = screenData.height > 800; // Approximate notch detection
  
  // ✅ HELPER FUNCTION ĐỂ TÍNH KHOẢNG CÁCH GIỮA 2 TOUCH
  const getDistance = (touch1: any, touch2: any) => {
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // ✅ TC3.1: RAYCASTING FOR TOUCH ANIMATION TRIGGER
  const performRaycasting = (touchX: number, touchY: number, screenWidth: number, screenHeight: number) => {
    if (!modelRef.current || !cameraRef.current || !rendererRef.current) return null;

    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    const mouse = new THREE.Vector2();
    mouse.x = (touchX / screenWidth) * 2 - 1;
    mouse.y = -(touchY / screenHeight) * 2 + 1;

    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // Check intersection with model
    const intersects = raycaster.intersectObject(modelRef.current, true);
    
    if (intersects.length > 0) {
      console.log('🎯 Model touched! Triggering animation...');
      return intersects[0];
    }
    return null;
  };

  // ✅ TC3.1: TRIGGER ANIMATION ON TOUCH
  const triggerTouchAnimation = (animationName: string = 'hit') => {
    if (!mixerRef.current || !modelRef.current) return;

    const anyModel = modelRef.current as any;
    const clips = anyModel.animations || [];
    
    if (clips.length > 0) {
      // Find animation clip
      const clip = clips.find((c: any) => 
        c.name?.toLowerCase().includes(animationName.toLowerCase())
      ) || clips[Math.floor(Math.random() * clips.length)]; // Random if not found

      // Stop current action and play new one
      mixerRef.current.stopAllAction();
      const action = mixerRef.current.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();

      setCurrentAnimation(animationName);
      setAnimationFeedback(`🎯 ${animationName.toUpperCase()}!`);
      console.log(`🎬 Playing touch animation: ${clip.name || animationName}`);

      // Clear feedback after short time
      setTimeout(() => setAnimationFeedback(''), 1000);

      // Return to idle after animation
      setTimeout(() => {
        if (mixerRef.current) {
          const idleClip = clips.find((c: any) => c.name?.toLowerCase().includes('idle')) || clips[0];
          const idleAction = mixerRef.current.clipAction(idleClip);
          idleAction.reset();
          idleAction.play();
          setCurrentAnimation('idle');
        }
      }, clip.duration * 1000 || 2000);
    }
  };

  // ✅ TC3.2: SWIPE GESTURE DETECTION AND THROW ANIMATION
  const detectSwipeGesture = (startX: number, startY: number, endX: number, endY: number, duration: number) => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration; // pixels per ms
    
    // Swipe thresholds
    const minDistance = 100; // minimum swipe distance
    const minVelocity = 0.5; // minimum swipe velocity
    
    if (distance > minDistance && velocity > minVelocity) {
      // Determine swipe direction
      const angle = Math.atan2(deltaY, deltaX);
      const direction = {
        horizontal: Math.abs(deltaX) > Math.abs(deltaY),
        vertical: Math.abs(deltaY) > Math.abs(deltaX),
        right: deltaX > 0,
        left: deltaX < 0,
        up: deltaY < 0,
        down: deltaY > 0
      };
      
      console.log(`🏐 Swipe detected! Distance: ${distance.toFixed(2)}, Velocity: ${velocity.toFixed(2)}, Direction:`, direction);
      
      // Trigger throw animation based on direction
      if (direction.horizontal) {
        triggerThrowAnimation(direction.right ? 'throw_right' : 'throw_left', velocity);
      } else if (direction.vertical) {
        triggerThrowAnimation(direction.up ? 'throw_up' : 'throw_down', velocity);
      }
      
      return true;
    }
    return false;
  };

  // ✅ TC3.2: TRIGGER THROW ANIMATION
  const triggerThrowAnimation = (throwType: string, velocity: number) => {
    if (!mixerRef.current || !modelRef.current) return;

    const anyModel = modelRef.current as any;
    const clips = anyModel.animations || [];
    
    if (clips.length > 0) {
      // Find throw animation or use attack/fly animation
      const throwClip = clips.find((c: any) => 
        c.name?.toLowerCase().includes('attack') ||
        c.name?.toLowerCase().includes('fly') ||
        c.name?.toLowerCase().includes('jump')
      ) || clips[Math.floor(Math.random() * clips.length)];

      // Stop current action and play throw animation
      mixerRef.current.stopAllAction();
      const action = mixerRef.current.clipAction(throwClip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      
      // Adjust playback speed based on swipe velocity
      const speedMultiplier = Math.min(Math.max(velocity / 2, 0.5), 3.0);
      action.setEffectiveTimeScale(speedMultiplier);
      action.play();

      setCurrentAnimation(throwType);
      setAnimationFeedback(`🏐 ${throwType.replace('_', ' ').toUpperCase()}!`);
      console.log(`🎬 Playing throw animation: ${throwClip.name || throwType} (speed: ${speedMultiplier.toFixed(2)}x)`);

      // Clear feedback after animation
      setTimeout(() => setAnimationFeedback(''), 1500);

      // Add visual feedback - temporary scale effect
      if (modelRef.current) {
        const originalScale = (modelRef.current as any).originalScale || 0.6;
        const scaleEffect = originalScale * (1 + velocity * 0.1);
        modelRef.current.scale.setScalar(scaleEffect);
        
        // Return to normal scale
        setTimeout(() => {
          if (modelRef.current) {
            modelRef.current.scale.setScalar(originalScale);
          }
        }, 200);
      }

      // Return to idle after animation
      setTimeout(() => {
        if (mixerRef.current) {
          const idleClip = clips.find((c: any) => c.name?.toLowerCase().includes('idle')) || clips[0];
          const idleAction = mixerRef.current.clipAction(idleClip);
          idleAction.reset();
          idleAction.play();
          setCurrentAnimation('idle');
        }
      }, (throwClip.duration * 1000 / speedMultiplier) || 1500);
    }
  };

  const handleTouchStart = (event: any) => {
    const touches = event.nativeEvent.touches;
    console.log(`👆 Touch start: ${touches.length} fingers`);
    
    if (touches.length === 1) {
      const touch = touches[0];
      
      // ✅ TC3.1: RAYCASTING CHECK FOR MODEL TOUCH - TC6.2: USE ACTUAL SCREEN DIMENSIONS
      const intersection = performRaycasting(touch.pageX, touch.pageY, screenData.width, screenData.height);
      
      if (intersection) {
        // Model was touched - trigger animation
        triggerTouchAnimation('hit');
      } else {
        // Empty space touched - could be rotation or swipe
        setTouchStart({ x: touch.pageX, y: touch.pageY });
        setSwipeStart({ x: touch.pageX, y: touch.pageY, time: Date.now() });
        setIsSwipeGesture(false);
        console.log(`🔄 Single touch - rotation/swipe mode`);
      }
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
  
  const handleTouchEnd = (event: any) => {
    console.log(`👆 Touch end`);
    
    // ✅ TC3.2: CHECK FOR SWIPE GESTURE ON TOUCH END
    if (swipeStart && !isSwipeGesture) {
      const touch = event.nativeEvent.changedTouches[0];
      const endTime = Date.now();
      const duration = endTime - swipeStart.time;
      
      const wasSwipe = detectSwipeGesture(
        swipeStart.x, 
        swipeStart.y, 
        touch.pageX, 
        touch.pageY, 
        duration
      );
      
      if (wasSwipe) {
        setIsSwipeGesture(true);
      }
    }
    
    setTouchStart(null);
    setSwipeStart(null);
    setInitialDistance(null);
    setIsSwipeGesture(false);
    
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
    
    // ✅ PRELOAD MODELS NGAY KHI KHỞI ĐỘNG APP
    preloadModels();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ✅ PRELOAD MODELS FOR INSTANT LOADING
  const preloadModels = async () => {
    try {
      console.log('⚡ Preloading models for instant access...');
      
      // ✅ PRELOAD SCIZOR MODEL - DIRECT LOADING
      try {
        const scizorModuleId = require('../assets/models/pokemon_scizor.glb');
        console.log('✅ Scizor model preloaded! ModuleId:', scizorModuleId);
      } catch (error) {
        console.log('⚠️ Scizor preload failed:', error);
      }
      
      // ✅ PRELOAD FOX MODEL - DIRECT LOADING
      try {
        const foxModuleId = require('../assets/models/Fox.glb');
        console.log('✅ Fox model preloaded! ModuleId:', foxModuleId);
      } catch (error) {
        console.log('⚠️ Fox preload failed:', error);
      }
      
    } catch (error) {
      console.log('⚠️ Preload failed, will load on demand:', error);
    }
  };

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
      
    } else if (config.id.includes('fox')) {
      // ✅ FOX FALLBACK MODEL
      console.log('🦊 Creating Fox fallback model');
      
      // Body (màu cam)
      const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 8);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF8C00 });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0;
      group.add(body);
      
      // Head (màu cam đậm)
      const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFF4500 });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 0.5;
      group.add(head);
      
      // Ears (màu cam)
      const earGeometry = new THREE.ConeGeometry(0.08, 0.15, 6);
      const earMaterial = new THREE.MeshStandardMaterial({ color: 0xFF4500 });
      
      const leftEar = new THREE.Mesh(earGeometry, earMaterial);
      leftEar.position.set(-0.1, 0.7, 0);
      leftEar.rotation.z = -0.2;
      group.add(leftEar);
      
      const rightEar = new THREE.Mesh(earGeometry, earMaterial);
      rightEar.position.set(0.1, 0.7, 0);
      rightEar.rotation.z = 0.2;
      group.add(rightEar);
      
      // Tail (màu cam với đuôi trắng)
      const tailGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.4, 6);
      const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xFF8C00 });
      const tail = new THREE.Mesh(tailGeometry, tailMaterial);
      tail.position.set(0, 0.1, -0.3);
      tail.rotation.x = Math.PI / 4;
      group.add(tail);
      
      // Tail tip (màu trắng)
      const tailTipGeometry = new THREE.SphereGeometry(0.08, 6, 6);
      const tailTipMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
      const tailTip = new THREE.Mesh(tailTipGeometry, tailTipMaterial);
      tailTip.position.set(0, 0.3, -0.5);
      group.add(tailTip);
      
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
          // ✅ DIRECT GLB LOADING FOR PERFECT COLORS
          console.log(`🎯 Using DIRECT GLB loading for perfect colors`);
          setLoadingProgress(40);
          setModelInfo(`Đang tải model ${glbConfig.name}...`);
          
          // ✅ REAL MODEL LOADING - TRY ASSET LOADING FIRST
          console.log('🎯 Attempting to load real model...');
          
          try {
            // ✅ METHOD 1: Direct require + loadAsync với error handling
            const { loadAsync } = await import('expo-three');
            let moduleId;
            
            // ✅ SAFE REQUIRE với try-catch
            try {
              if (glbConfig.filePath === 'assets/models/pokemon_scizor.glb') {
                moduleId = require('../assets/models/pokemon_scizor.glb');
              } else if (glbConfig.filePath === 'assets/models/Fox.glb') {
                moduleId = require('../assets/models/Fox.glb');
              } else {
                throw new Error(`Unknown model filePath: ${glbConfig.filePath}`);
              }
            } catch (requireError) {
              console.error('❌ Error requiring model file:', requireError);
              throw new Error(`Model file not found: ${glbConfig.filePath}`);
            }
            
            // ✅ VALIDATE MODULE ID
            if (!moduleId) {
              throw new Error(`Module ID is undefined for: ${glbConfig.filePath}`);
            }
            
            console.log('✅ Loading moduleId:', moduleId);
            const gltf = await loadAsync(moduleId);
            
            if (!gltf.scene) {
              throw new Error('No scene found in GLB file');
            }
            
            const loadedModel = gltf.scene;
            
            // Apply config settings
            if (glbConfig.scale) {
              loadedModel.scale.setScalar(glbConfig.scale);
            }
            
            setLoadingProgress(70);
            setModelInfo(`Đang áp dụng cài đặt...`);
            
            // Position model
            loadedModel.position.set(0, -0.5, 0);
            
            setLoadingProgress(85);
            setModelInfo(`Đang tối ưu materials...`);
            
            // Apply rotation
            if (glbConfig.rotation) {
              loadedModel.rotation.set(
                glbConfig.rotation.x,
                glbConfig.rotation.y,
                glbConfig.rotation.z
              );
            }
            
            modelRef.current = loadedModel;
            
            // Add to scene
            if (sceneRef.current) {
              loadedModel.renderOrder = -1;
              sceneRef.current.add(loadedModel);
              console.log('🎉 Real model added to scene successfully!');
            }
            
            // Store original scale
            (loadedModel as any).originalScale = glbConfig.scale || 1;
            (loadedModel as any).isUserRotating = false;
            
            setLoadingProgress(100);
            setModelInfo(`✅ ${glbConfig.name} đã sẵn sàng!`);
            console.log('🚀 Real model loaded successfully:', glbConfig.name);
            return;
            
          } catch (realLoadError) {
            console.log('⚠️ Real model loading failed, using fallback:', realLoadError);
            
            // ✅ DETAILED ERROR ANALYSIS
            const errorMessage = (realLoadError as Error).message;
            if (errorMessage?.includes('replace')) {
              console.error('❌ Asset URI issue - trying alternative loading method');
              setModelInfo('Lỗi tải asset - thử phương pháp khác...');
            } else if (errorMessage?.includes('undefined')) {
              console.error('❌ Undefined property - asset not loaded properly');
              setModelInfo('Asset không tải được - kiểm tra file GLB');
            } else {
              setModelInfo(`❌ Không thể tải ${glbConfig.name}: ${errorMessage}`);
            }
            
            // ✅ FALLBACK MODEL LOADING
            const fallbackModel = createFallbackModel(glbConfig);
            modelRef.current = fallbackModel;
            if (sceneRef.current) {
              sceneRef.current.add(fallbackModel);
            }
            
            setLoadingProgress(100);
            setModelInfo(`✅ ${glbConfig.name} (Fallback) đã sẵn sàng!`);
            console.log('🚀 Fallback model loaded successfully:', glbConfig.name);
            return;
          }
          
        } catch (glbError) {
          console.error(`❌ GLB loading failed for ${glbConfig.name}:`, glbError);
          
          // ✅ DETAILED ERROR ANALYSIS
          const errorMessage = (glbError as Error).message;
          if (errorMessage?.includes('replace')) {
            console.error('❌ Asset URI issue - trying alternative loading method');
            setModelInfo('Lỗi tải asset - thử phương pháp khác...');
          } else if (errorMessage?.includes('undefined')) {
            console.error('❌ Undefined property - asset not loaded properly');
            setModelInfo('Asset không tải được - kiểm tra file GLB');
          } else {
            setModelInfo(`❌ Không thể tải ${glbConfig.name}: ${errorMessage}`);
          }
          
          console.error(`❌ Error details:`, {
            message: errorMessage,
            stack: (glbError as Error).stack,
            config: glbConfig,
            filePath: glbConfig.filePath
          });
          
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
      const camera = new THREE.PerspectiveCamera(75, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000);
      const renderer = new Renderer({ gl });
      
      // ✅ Nếu model đã được load trước đó, add vào scene ngay
      if (modelRef.current) {
        scene.add(modelRef.current);
        console.log('🔄 Adding existing model to new scene');
      }
      
      // ✅ SETUP CAMERA
      camera.position.set(0, 0.6, 6.5); // ✅ nâng camera + lùi ra một chút
      camera.lookAt(0, 0, 0); // Nhìn thẳng vào center
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0); // Trong suốt để thấy camera
      
      // ✅ MÀU SẮC CHUẨN SRGB CHO ĐỘ CHÍNH XÁC CAO
      // @ts-ignore - tương thích nhiều phiên bản three
      if ((renderer as any).outputColorSpace !== undefined) {
        // @ts-ignore
        (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
      } else {
        // @ts-ignore
        renderer.outputEncoding = THREE.sRGBEncoding;
      }
      
      // ✅ PBR RENDERING CHO MÀU SẮC CHÍNH XÁC
      // @ts-ignore
      renderer.physicallyCorrectLights = true;
      // @ts-ignore
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      // @ts-ignore
      renderer.toneMappingExposure = 1.2; // Tăng exposure cho màu sắc rõ hơn
      
      // ✅ SHADOW SETTINGS CHO CHI TIẾT
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // ✅ STORE REFERENCES
      sceneRef.current = scene; // Lưu scene reference
      cameraRef.current = camera; // Lưu camera reference cho raycasting
      rendererRef.current = renderer; // Lưu renderer reference

        // ✅ ÁNH SÁNG TỐI ƯU CHO MÀU ĐỎ SCIZOR
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Tăng ambient cho màu đỏ
        scene.add(ambientLight);

      // ✅ DIRECTIONAL LIGHT CHÍNH - CHIẾU SÁNG MẠNH CHO MÀU ĐỎ
      const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // Tăng cường độ cho màu đỏ
      directionalLight.position.set(2, 5, 3);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);

      // ✅ ÁNH SÁNG BỔ SUNG CHO MÀU SẮC RÕ RÀNG
      const leftLight = new THREE.DirectionalLight(0xffffff, 0.6);
      leftLight.position.set(-4, 3, 3);
      scene.add(leftLight);

      const rightLight = new THREE.DirectionalLight(0xffffff, 0.6);
      rightLight.position.set(4, 3, 3);
      scene.add(rightLight);
      
      // ✅ POINT LIGHT CHO CHI TIẾT
      const pointLight = new THREE.PointLight(0xffffff, 0.8, 30);
      pointLight.position.set(0, 3, 4);
      scene.add(pointLight);
      
      // ✅ RIM LIGHT CHO WINGS
      const rimLight = new THREE.DirectionalLight(0x88ccff, 0.5);
      rimLight.position.set(0, 0, -5);
      scene.add(rimLight);

      // ✅ ANIMATION LOOP - TỐI ƯU HIỆU SUẤT!
      const animate = () => {
        timeoutRef.current = setTimeout(animate, 1000 / 30); // ✅ GIẢM XUỐNG 30 FPS CHO HIỆU SUẤT

        // ✅ UPDATE ANIMATION MIXER
        const delta = clockRef.current.getDelta();
        if (mixerRef.current) {
          mixerRef.current.update(delta);
        }

        if (modelRef.current) {
          const time = Date.now() * 0.001;

          // Update AnimationMixer nếu có
          if ((modelRef.current as any).updateMixer) {
            (modelRef.current as any).updateMixer(delta);
          }
          
          // ✅ BREATHING ANIMATION - TỐI ƯU!
          if ((modelRef.current as any).animate) {
            (modelRef.current as any).animate();
          } else {
            // ✅ TỐI ƯU BREATHING - CHỈ KHI CẦN THIẾT
            const originalScale = (modelRef.current as any).originalScale || 1;
            const breathingScale = originalScale + Math.sin(time * 1.0) * 0.03; // ✅ GIẢM FREQUENCY VÀ AMPLITUDE
            modelRef.current.scale.setScalar(breathingScale);
          }
          
          // ✅ TỰ ĐỘNG XOAY - GIẢM TỐC ĐỘ
          if (!(modelRef.current as any).isUserRotating) {
            modelRef.current.rotation.y += 0.02; // ✅ TĂNG NHẸ để thấy rõ
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
          <View>
            <Text style={styles.instruction}>
              🦂 {modelInfo || 'Pokemon đã sẵn sàng!'}
            </Text>
            {/* ✅ TC6.1: ANIMATION FEEDBACK UI */}
            {animationFeedback && (
              <Text style={styles.animationFeedback}>
                {animationFeedback}
              </Text>
            )}
          </View>
        )}
        
        {/* ✅ REMOVED INSTRUCTION TEXT AS REQUESTED */}

        {/* ✅ CHỈ HIỆN KHI ĐANG LOADING ĐỂ TRÁNH RỐI UI */}
        {scannedData && isLoading && (
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
    zIndex: 1000, // ✅ UI ELEMENTS LUÔN Ở TRÊN 3D MODEL
    alignItems: 'center',
    // ✅ TC6.2: ADAPTIVE PADDING FOR DIFFERENT DEVICES
    paddingTop: Platform.OS === 'ios' ? (Dimensions.get('window').height > 800 ? 60 : 40) : 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingHorizontal: 20,
  },
  instruction: {
    color: '#fff',
    // ✅ TC6.2: RESPONSIVE FONT SIZE
    fontSize: Dimensions.get('window').width < 375 ? 16 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)', // ✅ TĂNG OPACITY CHO RÕ RÀNG
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // ✅ VIỀN TRẮNG NHẸ
    // ✅ TC6.2: ENSURE VISIBILITY ON ALL DEVICES
    maxWidth: Dimensions.get('window').width - 40,
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
  // ✅ TC6.1: ANIMATION FEEDBACK STYLES
  animationFeedback: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
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
