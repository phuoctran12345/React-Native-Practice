// 🎮 Custom Keymap cho Expo Metro Bundler
// Thêm các keymap tùy chỉnh cho AR Pokemon App

const keymap = {
  // 🔄 Reset & Reload Commands
  'ctrl+r': () => {
    console.log('🔄 Hard reload app...');
    process.emit('SIGUSR2'); // Reload Metro
  },
  
  'ctrl+shift+r': () => {
    console.log('🗑️ Clear cache and reload...');
    // Clear Metro cache
    process.emit('SIGUSR1');
  },
  
  // 🎯 AR Specific Commands
  'ctrl+a': () => {
    console.log('🎯 AR Mode - Test Scizor model');
    console.log('📱 Quét QR code: scizor');
  },
  
  'ctrl+p': () => {
    console.log('⚡ Pikachu Mode - Test Pikachu model');
    console.log('📱 Quét QR code: pikachu');
  },
  
  // 🔧 Debug Commands
  'ctrl+d': () => {
    console.log('🔧 Debug Mode - Show debug info');
    console.log('📊 Model info, cache status, performance metrics');
  },
  
  'ctrl+c': () => {
    console.log('🗑️ Clear Cache - Reset model cache');
    console.log('🔄 Reloading models from GitHub Pages...');
  },
  
  // 🚀 Performance Commands
  'ctrl+shift+p': () => {
    console.log('🚀 Performance Mode - Optimize rendering');
    console.log('⚡ 60 FPS, reduced quality for testing');
  },
  
  'ctrl+shift+q': () => {
    console.log('🎮 Quality Mode - High quality rendering');
    console.log('✨ Full quality, all effects enabled');
  },
  
  // 📱 Device Commands
  'ctrl+1': () => {
    console.log('📱 iOS Simulator - Open iOS simulator');
    console.log('🍎 Testing on iOS device');
  },
  
  'ctrl+2': () => {
    console.log('🤖 Android - Open Android emulator');
    console.log('🤖 Testing on Android device');
  },
  
  'ctrl+3': () => {
    console.log('🌐 Web - Open in browser');
    console.log('💻 Testing AR in web browser');
  },
  
  // 🎨 AR Commands
  'ctrl+shift+a': () => {
    console.log('🎨 AR Settings - Toggle AR features');
    console.log('📷 Camera, lighting, shadows, animations');
  },
  
  'ctrl+shift+m': () => {
    console.log('🎭 Model Settings - Toggle model features');
    console.log('🎬 Animations, materials, textures');
  },
  
  // 🆘 Help Commands
  'ctrl+h': () => {
    console.log('🆘 Help - Show all commands');
    console.log(`
🎮 AR Pokemon App - Custom Keymap:

🔄 Reset & Reload:
  Ctrl+R     - Hard reload app
  Ctrl+Shift+R - Clear cache and reload

🎯 AR Models:
  Ctrl+A     - Test Scizor model
  Ctrl+P     - Test Pikachu model

🔧 Debug:
  Ctrl+D     - Show debug info
  Ctrl+C     - Clear model cache

🚀 Performance:
  Ctrl+Shift+P - Performance mode (60 FPS)
  Ctrl+Shift+Q - Quality mode (high quality)

📱 Devices:
  Ctrl+1     - iOS Simulator
  Ctrl+2     - Android
  Ctrl+3     - Web browser

🎨 AR Features:
  Ctrl+Shift+A - AR settings
  Ctrl+Shift+M - Model settings

🆘 Help:
  Ctrl+H     - Show this help
    `);
  }
};

// Export keymap
module.exports = keymap;
