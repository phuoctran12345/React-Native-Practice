// ✅ SIMPLIFIED Metro Config - Fix bundler errors
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ✅ CHỈ THÊM 3D FILE EXTENSIONS
config.resolver.assetExts.push('glb', 'gltf', 'bin', 'fbx', 'obj', 'dae');

module.exports = config;
