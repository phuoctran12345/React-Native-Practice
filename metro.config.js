// 🎮 Metro Config cho AR Pokemon App
// Cấu hình Metro Bundler với keymap tùy chỉnh

const { getDefaultConfig } = require('expo/metro-config');
const keymap = require('./metro.keymap.js');

const config = getDefaultConfig(__dirname);

// 🎯 Custom keymap cho AR Pokemon App
config.server = {
  ...config.server,
  // Thêm keymap tùy chỉnh
  keymap: keymap,
  
  // Cấu hình cho AR models
  experimentalImportSupport: true,
  unstable_allowRequireContext: true,
  
  // Optimize cho 3D models
  resolver: {
    ...config.resolver,
    assetExts: [
      ...config.resolver.assetExts,
      'glb', 'gltf', 'bin', 'fbx', 'obj', 'dae'
    ],
  },
  
  // Transformer cho 3D files
  transformer: {
    ...config.transformer,
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  },
};

// 🎮 Custom commands cho AR Pokemon App
config.server.customCommands = {
  'ar-scizor': () => {
    console.log('🎯 AR Scizor Mode');
    console.log('📱 Quét QR code: scizor');
    console.log('🔄 Loading Pokemon Scizor từ GitHub Pages...');
  },
  
  'ar-pikachu': () => {
    console.log('⚡ AR Pikachu Mode');
    console.log('📱 Quét QR code: pikachu');
    console.log('🔄 Loading Pikachu model...');
  },
  
  'ar-debug': () => {
    console.log('🔧 AR Debug Mode');
    console.log('📊 Model info, cache status, performance');
  },
  
  'ar-reset': () => {
    console.log('🔄 AR Reset');
    console.log('🗑️ Clear cache, reload models');
  }
};

module.exports = config;
