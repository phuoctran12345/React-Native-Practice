import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Asset } from 'expo-asset';

const { width, height } = Dimensions.get('window');

export default function SimpleARViewer() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  const onContextCreate = async (gl: any) => {
    console.log('🎬 Simple AR Context Created');
    
    // ✅ SIMPLE THREE.JS SETUP
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000);
    const renderer = new Renderer({ gl });
    
    // ✅ SIMPLE LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    
    scene.add(ambientLight);
    scene.add(directionalLight);
    
    // ✅ STORE REFERENCES
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    // ✅ SIMPLE ANIMATION LOOP
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (model) {
        model.rotation.y += 0.01; // Simple rotation
      }
      
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
  };

  const loadSimpleModel = async () => {
    try {
      setIsLoading(true);
      console.log('📦 Loading simple GLB model...');
      
      // ✅ DIRECT GLB LOADING - NO COMPLEXITY
      const asset = Asset.fromModule(require('../assets/models/pokemon_concua/pokemon_scizor.glb'));
      await asset.downloadAsync();
      
      // ✅ USE EXPO-THREE'S SIMPLE LOADER
      const { loadAsync } = await import('expo-three');
      const gltf = await loadAsync(asset.uri);
      
      if (gltf.scene) {
        const loadedModel = gltf.scene;
        
        // ✅ SIMPLE SCALING AND POSITIONING
        loadedModel.scale.set(0.5, 0.5, 0.5);
        loadedModel.position.set(0, -1, 0);
        
        // ✅ ADD TO SCENE
        if (sceneRef.current) {
          sceneRef.current.add(loadedModel);
          setModel(loadedModel);
        }
        
        console.log('✅ Simple model loaded successfully!');
      }
    } catch (error) {
      console.error('❌ Simple model loading failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }: any) => {
    if (data === 'scizor' && !scanned) {
      setScanned(true);
      loadSimpleModel();
    }
  };

  if (!permission) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
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
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      {scanned && (
        <GLView
          style={styles.glView}
          onContextCreate={onContextCreate}
        />
      )}
      
      <View style={styles.overlay}>
        {!scanned && (
          <Text style={styles.instruction}>
            Quét QR code để hiển thị Pokemon 3D
          </Text>
        )}
        
        {scanned && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>🦂 Scizor đã sẵn sàng!</Text>
          </View>
        )}
        
        {isLoading && (
          <Text style={styles.loadingText}>Đang tải mô hình...</Text>
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
  glView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  instruction: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
  },
  successBanner: {
    position: 'absolute',
    top: 50,
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
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  closeButton: {
    position: 'absolute',
    bottom: 50,
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
