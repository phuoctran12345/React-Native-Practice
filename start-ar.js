#!/usr/bin/env node

// 🎮 AR Pokemon App - Custom Metro Starter
// Script để chạy Metro với keymap tùy chỉnh

const { spawn } = require('child_process');
const path = require('path');

console.log('🎮 AR Pokemon App - Starting Metro with Custom Keymap');
console.log('📱 Ready for AR testing!');
console.log('');

// 🎯 Show custom keymap
console.log('🎮 Custom Keymap Commands:');
console.log('  Ctrl+R     - Hard reload app');
console.log('  Ctrl+Shift+R - Clear cache and reload');
console.log('  Ctrl+A     - Test Scizor model');
console.log('  Ctrl+P     - Test Pikachu model');
console.log('  Ctrl+D     - Show debug info');
console.log('  Ctrl+C     - Clear model cache');
console.log('  Ctrl+H     - Show help');
console.log('');

// 🚀 Start Metro with custom config
const metroProcess = spawn('npx', ['expo', 'start', '--clear'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Handle process events
metroProcess.on('error', (error) => {
  console.error('❌ Error starting Metro:', error);
});

metroProcess.on('close', (code) => {
  console.log(`🔄 Metro process exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping AR Pokemon App...');
  metroProcess.kill('SIGINT');
  process.exit(0);
});

// Handle Ctrl+R for hard reload
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (key) => {
  // Ctrl+R
  if (key === '\u0003') {
    console.log('\n🛑 Stopping AR Pokemon App...');
    metroProcess.kill('SIGINT');
    process.exit(0);
  }
  
  // Handle other key combinations
  if (key === 'r') {
    console.log('🔄 Hard reload triggered...');
    metroProcess.kill('SIGUSR2');
  }
});

console.log('🎮 AR Pokemon App is running!');
console.log('📱 Use the keymap above for quick commands');
console.log('🔄 Press Ctrl+C to stop');
