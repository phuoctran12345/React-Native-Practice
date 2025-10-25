import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, loadAsync } from 'expo-three';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';

interface FoxARViewerProps {
  onClose: () => void;
}

const FoxARViewer: React.FC<FoxARViewerProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelInfo, setModelInfo] = useState<string>('');
  const [currentAnimation, setCurrentAnimation] = useState<string>('Survey');
  const [animationFeedback, setAnimationFeedback] = useState<string>('');
  const [showDebugControls, setShowDebugControls] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef(new THREE.Clock());
  
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
  const getDistance = (touch1: { x: number; y: number }, touch2: { x: number; y: number }) => {
    const dx = touch1.x - touch2.x;
    const dy = touch1.y - touch2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // ✅ RAYCASTING CHO TOUCH INTERACTION
  const performRaycasting = (touchX: number, touchY: number, screenWidth: number, screenHeight: number) => {
    if (!cameraRef.current || !sceneRef.current) return null;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Convert screen coordinates to normalized device coordinates
    mouse.x = (touchX / screenWidth) * 2 - 1;
    mouse.y = -(touchY / screenHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    return intersects.length > 0 ? intersects[0] : null;
  };

  // ✅ TRIGGER TOUCH ANIMATION
  const triggerTouchAnimation = (animationName: string = 'hit') => {
    if (mixerRef.current && modelRef.current) {
      const animations = modelRef.current.animations || [];
      const animation = animations.find(anim => anim.name === animationName);
      
      if (animation) {
        const action = mixerRef.current.clipAction(animation);
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        setAnimationFeedback(`Animation ${animationName} triggered!`);
        setTimeout(() => setAnimationFeedback(''), 2000);
      }
    }
  };

  // ✅ SWIPE GESTURE DETECTION
  const detectSwipeGesture = (startX: number, startY: number, endX: number, endY: number, duration: number) => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Swipe detection criteria
    if (distance > 50 && velocity > 0.3) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      if (angle > -45 && angle < 45) {
        return 'right';
      } else if (angle > 135 || angle < -135) {
        return 'left';
      } else if (angle > 45 && angle < 135) {
        return 'down';
      } else if (angle > -135 && angle < -45) {
        return 'up';
      }
    }
    return null;
  };

  // ✅ THROW ANIMATION TRIGGER
  const triggerThrowAnimation = (throwType: string, velocity: number) => {
    if (mixerRef.current && modelRef.current) {
      const animations = modelRef.current.animations || [];
      let animationName = 'Survey'; // Default animation
      
      // Select animation based on throw type and velocity
      if (throwType === 'up' && velocity > 0.5) {
        animationName = 'Run';
      } else if (throwType === 'right' || throwType === 'left') {
        animationName = 'Walk';
      }
      
      const animation = animations.find(anim => anim.name === animationName);
      if (animation) {
        const action = mixerRef.current.clipAction(animation);
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        setAnimationFeedback(`Fox ${animationName} animation triggered!`);
        setTimeout(() => setAnimationFeedback(''), 3000);
      }
    }
  };

  // ✅ ENHANCED TOUCH START HANDLER
  const handleTouchStart = (event: any) => {
    const touches = event.nativeEvent.touches;
    const now = Date.now();
    
    if (touches.length === 1) {
      setTouchStart({ x: touches[0].pageX, y: touches[0].pageY });
      setSwipeStart({ x: touches[0].pageX, y: touches[0].pageY, time: now });
      setIsSwipeGesture(false);
    } else if (touches.length === 2) {
      const distance = getDistance(
        { x: touches[0].pageX, y: touches[0].pageY },
        { x: touches[1].pageX, y: touches[1].pageY }
      );
      setInitialDistance(distance);
    }
  };

  // ✅ ENHANCED TOUCH MOVE HANDLER
  const handleTouchMove = (event: any) => {
    const touches = event.nativeEvent.touches;
    
    if (touches.length === 1 && touchStart && modelRef.current) {
      // Single touch - rotation with smooth interpolation
      const deltaX = touches[0].pageX - touchStart.x;
      const deltaY = touches[0].pageY - touchStart.y;
      
      // Smooth rotation with damping
      const damping = 0.02;
      rotationRef.current.y += deltaX * damping;
      rotationRef.current.x += deltaY * damping;
      
      // Limit vertical rotation
      rotationRef.current.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotationRef.current.x));
      
      modelRef.current.rotation.y = rotationRef.current.y;
      modelRef.current.rotation.x = rotationRef.current.x;
      
      setTouchStart({ x: touches[0].pageX, y: touches[0].pageY });
      
      // Update swipe tracking
      if (swipeStart) {
        const deltaX = touches[0].pageX - swipeStart.x;
        const deltaY = touches[0].pageY - swipeStart.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > 10) {
          setIsSwipeGesture(true);
        }
      }
    } else if (touches.length === 2 && initialDistance && modelRef.current) {
      // Two touches - zoom with smooth scaling
      const distance = getDistance(
        { x: touches[0].pageX, y: touches[0].pageY },
        { x: touches[1].pageX, y: touches[1].pageY }
      );
      
      const scale = distance / initialDistance;
      const newScale = Math.max(0.3, Math.min(5, currentScale * scale));
      
      modelRef.current.scale.setScalar(newScale);
      setCurrentScale(newScale);
    }
  };

  // ✅ ENHANCED TOUCH END HANDLER
  const handleTouchEnd = (event: any) => {
    const touches = event.nativeEvent.touches;
    
    if (touches.length === 0 && swipeStart && isSwipeGesture) {
      // Process swipe gesture
      const now = Date.now();
      const duration = now - swipeStart.time;
      const deltaX = event.nativeEvent.pageX - swipeStart.x;
      const deltaY = event.nativeEvent.pageY - swipeStart.y;
      
      const swipeDirection = detectSwipeGesture(
        swipeStart.x, swipeStart.y,
        swipeStart.x + deltaX, swipeStart.y + deltaY,
        duration
      );
      
      if (swipeDirection) {
        const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / duration;
        triggerThrowAnimation(swipeDirection, velocity);
      }
    }
    
    setTouchStart(null);
    setInitialDistance(null);
    setSwipeStart(null);
    setIsSwipeGesture(false);
  };

  // ✅ GESTURE HANDLER STATE CHANGE
  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      // Handle gesture end
      setTouchStart(null);
      setInitialDistance(null);
    }
  };

  // ✅ LOAD FOX MODEL WITH ADVANCED TEXTURE LOADING
  const loadFoxModel = async () => {
    try {
      setIsLoading(true);
      setLoadingProgress(0);
      setModelInfo('Đang tải model Fox...');

      // Load the Fox GLB model
      const asset = Asset.fromModule(require('../assets/models/Fox.glb'));
      await asset.downloadAsync();
      
      setLoadingProgress(30);
      setModelInfo('Đang giải mã model...');

      // Load the model using GLTFLoader with texture support
      const GLTFLoader = (await import('three/examples/jsm/loaders/GLTFLoader.js')).GLTFLoader;
      const DRACOLoader = (await import('three/examples/jsm/loaders/DRACOLoader.js')).DRACOLoader;
      
      const loader = new GLTFLoader();
      
      // ✅ CRITICAL: Configure loader to handle textures properly
      loader.setRequestHeader({});
      
      // ✅ Enable texture loading from embedded data
      (loader as any).setResourcePath('');
      
      console.log('🔧 GLTFLoader configured for texture loading');
      
      // Setup DRACO loader for compressed models (optional)
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
      loader.setDRACOLoader(dracoLoader);
      
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          asset.localUri || asset.uri,
          (gltf) => {
            console.log('✅ ========== GLB LOADED SUCCESSFULLY ==========');
            console.log('🔍 Checking loaded content:');
            console.log('  ✓ Has scene:', !!gltf.scene);
            console.log('  ✓ Has animations:', !!gltf.animations);
            console.log('  ✓ Has parser:', !!gltf.parser);
            const gltfAny = gltf as any;
            console.log('  ✓ Has textures array:', !!gltfAny.textures);
            console.log('  ✓ Textures count:', gltfAny.textures?.length || 0);
            console.log('  ✓ Scenes:', gltf.scenes.length);
            console.log('  ✓ Animations:', gltf.animations?.length || 0);
            console.log('  ✓ Cameras:', gltf.cameras?.length || 0);
            
            // Log texture information if available
            if (gltf.parser && gltf.parser.json) {
              console.log('  - Images in JSON:', gltf.parser.json.images?.length || 0);
              console.log('  - Textures in JSON:', gltf.parser.json.textures?.length || 0);
              console.log('  - Materials in JSON:', gltf.parser.json.materials?.length || 0);
              
              // Log image details
              if (gltf.parser.json.images) {
                gltf.parser.json.images.forEach((img: any, idx: number) => {
                  console.log(`  - Image ${idx + 1}:`, {
                    mimeType: img.mimeType,
                    hasUri: !!img.uri,
                    hasBufferView: img.bufferView !== undefined,
                    bufferViewIndex: img.bufferView
                  });
                });
              }
              
              // Log texture details
              if (gltf.parser.json.textures) {
                gltf.parser.json.textures.forEach((tex: any, idx: number) => {
                  console.log(`  - Texture ${idx + 1}:`, {
                    hasSource: tex.source !== undefined,
                    sourceIndex: tex.source,
                    hasSampler: tex.sampler !== undefined
                  });
                });
              }
            }
            
            resolve(gltf);
          },
          (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 70) + 30;
            setLoadingProgress(percent);
            console.log(`📊 Loading progress: ${percent}%`);
          },
          (error) => {
            console.error('❌ Error loading GLB:', error);
            reject(error);
          }
        );
      });

      setLoadingProgress(100);
      setModelInfo('Model Fox đã sẵn sàng!');

      return gltf;
    } catch (error) {
      console.error('Lỗi khi tải model Fox:', error);
      Alert.alert('Lỗi', 'Không thể tải model Fox. Vui lòng thử lại.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ENHANCED 3D SCENE INITIALIZATION
  const onContextCreate = async (gl: any) => {
    try {
      // Create renderer with advanced settings
      const renderer = new Renderer({ gl });
      renderer.setSize(screenData.width, screenData.height);
      renderer.setClearColor(0x87CEEB, 1.0); // Sky blue background
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // Note: antialias is set in WebGL context creation, not on renderer
      rendererRef.current = renderer;

      // Create scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // ✅ ADVANCED LIGHTING SETUP - ENHANCED FOR TEXTURE VISIBILITY
      const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Increased to 2.0 for texture visibility
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0); // Increased intensity
      directionalLight.position.set(10, 10, 5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 50;
      directionalLight.shadow.camera.left = -10;
      directionalLight.shadow.camera.right = 10;
      directionalLight.shadow.camera.top = 10;
      directionalLight.shadow.camera.bottom = -10;
      scene.add(directionalLight);
      
      // Add second directional light from opposite side
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
      directionalLight2.position.set(-5, 5, -5);
      scene.add(directionalLight2);

      // Add hemisphere light for more realistic lighting
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x999999, 0.8); // Increased
      scene.add(hemisphereLight);

      // Create camera with proper positioning
      const camera = new THREE.PerspectiveCamera(
        75,
        screenData.width / screenData.height,
        0.1,
        1000
      );
      camera.position.set(0, 0, 5);
      cameraRef.current = camera;

      // Load Fox model
      console.log('🚀 [1] Starting to load Fox model...');
      const gltf = await loadFoxModel() as any;
      console.log('✅ [2] Fox model loaded! GLTF object:', Object.keys(gltf));
      
      const foxModel = gltf.scene;
      console.log('📦 [3] Got fox scene, children count:', foxModel.children.length);
      
      // ✅ CRITICAL: Wait for all textures to fully load before processing
      console.log('⏳ [4] Waiting for textures to load...');
      await new Promise((resolve) => {
        const checkTexture = () => {
          console.log('🔍 [5] Checking texture status...');
          let allTexturesLoaded = true;
          let textureCount = 0;
          let loadedCount = 0;
          
          foxModel.traverse((child: any) => {
            if (child instanceof THREE.Mesh) {
              console.log('  📦 Checking mesh:', child.name || 'unnamed');
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((material: any) => {
                if (material.map) {
                  textureCount++;
                  console.log('    🖼️ Found texture map for material:', material.name || 'unnamed');
                  console.log('      - Has image:', !!material.map.image);
                  console.log('      - Image width:', material.map.image?.width || 'NO IMAGE');
                  console.log('      - Image height:', material.map.image?.height || 'NO IMAGE');
                  if (material.map.image) {
                    loadedCount++;
                  } else {
                    allTexturesLoaded = false;
                    console.log('    ⏳ Texture still loading for material:', material.name || 'unnamed');
                  }
                } else {
                  console.log('    ❌ No texture map found for material:', material.name || 'unnamed');
                }
              });
            }
          });
          
          console.log(`📊 [6] Texture status: ${loadedCount}/${textureCount} loaded`);
          
          if (allTexturesLoaded) {
            console.log('✅ [7] All textures loaded!');
            resolve(true);
          } else {
            console.log('⏳ [8] Still waiting for textures...');
            setTimeout(checkTexture, 100);
          }
        };
        checkTexture();
      });
      
      // ✅ ENHANCED MODEL SETUP
      foxModel.scale.setScalar(0.01); // Scale down the model
      foxModel.position.set(0, -1, 0);
      foxModel.castShadow = true;
      foxModel.receiveShadow = true;
      
      // Enable shadows for all meshes
      console.log('🦊 [9] === PROCESSING FOX MODEL ===');
      let meshCount = 0;
      let materialCount = 0;
      foxModel.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          meshCount++;
          child.castShadow = true;
          child.receiveShadow = true;
          
          console.log(`📦 [9.${meshCount}] Processing mesh #${meshCount}:`, child.name || 'unnamed');
          
          // ✅ ENSURE TEXTURES ARE LOADED AND APPLIED
          if (child.material) {
            materialCount++;
            // Handle array of materials or single material
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            
            materials.forEach((material: any, matIndex: number) => {
              console.log(`  🎨 [9.${meshCount}.${matIndex}] Material #${matIndex}:`);
              console.log(`    - Type: ${material.type}`);
              console.log(`    - Name: ${material.name || 'unnamed'}`);
              console.log(`    - Has Map: ${!!material.map}`);
              console.log(`    - Map Image Loaded: ${material.map ? !!material.map.image : 'NO MAP'}`);
              if (material.map) {
                console.log(`    - Map Image Size: ${material.map.image?.width || 0}x${material.map.image?.height || 0}`);
                console.log(`    - Map Format: ${material.map.format}`);
                console.log(`    - Map Type: ${material.map.type}`);
                console.log(`    - Map Encoding: ${material.map.encoding}`);
              }
              console.log(`    - Color: ${material.color.getHexString()}`);
              console.log(`    - Roughness: ${material.roughness}`);
              console.log(`    - Metalness: ${material.metalness}`);
              
              // Skip if already processed
              if (!material.isMeshStandardMaterial && material.map) {
                console.log('  ⚠️ Non-standard material with map detected');
              }
              
                             // CRITICAL: Ensure proper material settings for texture rendering
               if (material.map) {
                 console.log('  ✅ Texture found!');
                 console.log('    - Image loaded:', !!material.map.image);
                 console.log('    - Image size:', material.map.image?.width, 'x', material.map.image?.height);
                 console.log('    - Image type:', material.map.image?.constructor.name);
                 console.log('    - Texture format:', material.map.format);
                 console.log('    - Texture type:', material.map.type);
                 console.log('    - Texture encoding:', material.map.encoding);
                 console.log('    - Texture needsUpdate:', material.map.needsUpdate);
                 
                 // Force texture update
                 material.map.needsUpdate = true;
                 material.map.flipY = false; // GLB textures are usually not flipped
                 (material.map as any).colorSpace = 'srgb';
                 
                 // Ensure proper texture wrapping
                 material.map.wrapS = THREE.RepeatWrapping;
                 material.map.wrapT = THREE.RepeatWrapping;
                 
                 // Ensure proper texture filtering
                 material.map.magFilter = THREE.LinearFilter;
                 material.map.minFilter = THREE.LinearMipmapLinearFilter;
                 
                 // Set encoding for proper color space (using alternative property name)
                 (material.map as any).colorSpace = 'srgb';
                 
                 // Ensure material uses the texture
                 material.color.setHex(0xffffff);
                 material.vertexColors = false;
                 
                 // Disable emissive to see texture colors
                 material.emissive.setHex(0x000000);
                 material.emissiveIntensity = 0;
                 
                 // Set proper roughness if not set
                 if (material.roughness === undefined) {
                   material.roughness = 0.5;
                 }
                 if (material.metalness === undefined) {
                   material.metalness = 0;
                 }
                 
                 // Ensure texture is being used
                 // material.map.uvTransform = new THREE.Matrix3(); // Commented out - may cause issues
               } else {
                 console.log('  ⚠️ No texture map found');
                 
                 // ✅ ATTEMPT TO LOAD TEXTURE FROM GLTF STRUCTURE MANUALLY
                 if (gltf.parser && gltf.parser.json) {
                   console.log('  🔄 Attempting to load texture from GLTF structure...');
                   
                   const json = gltf.parser.json;
                   if (json.images && json.images.length > 0 && json.textures && json.textures.length > 0) {
                     console.log('  📦 Found images and textures in GLTF structure');
                     
                     // Get the first texture
                     const textureData = json.textures[0];
                     const imageData = json.images[textureData.source];
                     
                     console.log('  🖼️ Image data:', {
                       mimeType: imageData.mimeType,
                       hasBufferView: imageData.bufferView !== undefined
                     });
                     
                     if (imageData.bufferView !== undefined) {
                       console.log('  ✅ Texture is embedded in GLB, waiting for GLTFLoader...');
                       // GLTFLoader should handle this, but force a check
                       setTimeout(() => {
                         if (material.map && !material.map.image) {
                           console.log('  ⚠️ Texture still not loaded after waiting');
                           material.color.setHex(0xffffff);
                         }
                       }, 500);
                     }
                   }
                 }
                 
                 // Still set to white to avoid black rendering
                 material.color.setHex(0xffffff);
                 material.emissive.setHex(0x000000);
                 material.emissiveIntensity = 0;
               }
              
              // Force material update
              material.needsUpdate = true;
            });
          } else {
            console.log('  ⚠️ No material found for mesh');
          }
        }
      });
      console.log(`✅ [10] === FOX MODEL PROCESSING COMPLETE ===`);
      console.log(`   📊 Total meshes processed: ${meshCount}`);
      console.log(`   📊 Total materials processed: ${materialCount}`);
      
      console.log(`🎭 [11] Adding fox model to scene...`);
      scene.add(foxModel);
      modelRef.current = foxModel;
      console.log(`✅ [12] Fox model added to scene!`);

      // ✅ ADVANCED ANIMATION SETUP
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(foxModel);
        mixerRef.current = mixer;
        
        // Play the first animation (Survey)
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
        setCurrentAnimation('Survey');
        setAnimationFeedback('Animation Survey đang chạy');
      }

      // ✅ ENHANCED ANIMATION LOOP
      const animate = () => {
        requestAnimationFrame(animate);
        
        if (mixerRef.current) {
          mixerRef.current.update(clockRef.current.getDelta());
        }
        
        if (modelRef.current) {
          // Smooth auto rotation
          modelRef.current.rotation.y += 0.005;
        }
        
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      
      animate();

      // Update debug info
      setDebugInfo({
        modelLoaded: true,
        animations: gltf.animations?.length || 0,
        meshes: foxModel.children.length,
        renderer: renderer.info
      });

    } catch (error) {
      console.error('Lỗi khi khởi tạo scene:', error);
      Alert.alert('Lỗi', 'Không thể khởi tạo scene 3D.');
    }
  };

  // ✅ ENHANCED ANIMATION CONTROLS
  const playAnimation = (animationName: string) => {
    if (mixerRef.current && modelRef.current) {
      // Stop current animation
      mixerRef.current.stopAllAction();
      
      // Find and play the requested animation
      const animations = modelRef.current.animations || [];
      const animation = animations.find(anim => anim.name === animationName);
      
      if (animation) {
        const action = mixerRef.current.clipAction(animation);
        action.reset();
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
        setCurrentAnimation(animationName);
        setAnimationFeedback(`Animation ${animationName} đang chạy`);
      } else {
        setAnimationFeedback(`Không tìm thấy animation: ${animationName}`);
      }
    }
  };

  // ✅ DEBUG CONTROLS
  const toggleDebugControls = () => {
    setShowDebugControls(!showDebugControls);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{modelInfo}</Text>
          <Text style={styles.progressText}>{loadingProgress}%</Text>
        </View>
      )}
      
      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, currentAnimation === 'Survey' && styles.activeButton]}
          onPress={() => playAnimation('Survey')}
        >
          <Text style={styles.buttonText}>Survey</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, currentAnimation === 'Walk' && styles.activeButton]}
          onPress={() => playAnimation('Walk')}
        >
          <Text style={styles.buttonText}>Walk</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, currentAnimation === 'Run' && styles.activeButton]}
          onPress={() => playAnimation('Run')}
        >
          <Text style={styles.buttonText}>Run</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.debugButton} onPress={toggleDebugControls}>
          <Text style={styles.debugButtonText}>Debug</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Đóng</Text>
        </TouchableOpacity>
      </View>
      
      {/* Animation feedback */}
      {animationFeedback ? (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{animationFeedback}</Text>
        </View>
      ) : null}
      
      {/* Debug info */}
      {showDebugControls && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>Model: {debugInfo.modelLoaded ? 'Loaded' : 'Not loaded'}</Text>
          <Text style={styles.debugText}>Animations: {debugInfo.animations}</Text>
          <Text style={styles.debugText}>Meshes: {debugInfo.meshes}</Text>
          <Text style={styles.debugText}>Scale: {currentScale.toFixed(2)}</Text>
          <Text style={styles.debugText}>Rotation: X:{rotationRef.current.x.toFixed(2)}, Y:{rotationRef.current.y.toFixed(2)}</Text>
        </View>
      )}
      
      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          🦊 Fox 3D Viewer{'\n'}
          • Chạm 1 ngón tay để xoay{'\n'}
          • Chạm 2 ngón tay để zoom{'\n'}
          • Vuốt để trigger animation{'\n'}
          • Nhấn nút để chuyển animation
        </Text>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  glView: {
    flex: 1,
  },
  loadingOverlay: {
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
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  progressText: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    margin: 2,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: 'rgba(255, 165, 0, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    margin: 2,
  },
  debugButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 2,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  feedbackContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  feedbackText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  debugContainer: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 10,
  },
  debugTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 5,
  },
  instructionsContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 10,
  },
  instructionsText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default FoxARViewer;
