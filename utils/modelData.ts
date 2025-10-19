// Dữ liệu model 3D được hardcode
// Mỗi QR code sẽ chứa một modelId tương ứng với model trong database này

import { GLBModelConfig } from './DynamicGLBLoader';

// Legacy interface (để tương thích với code cũ)
export interface ModelData {
  id: string;
  name: string;
  modelPath: string; // Đường dẫn file .glb trong assets
  description: string;
  scale: number; // Tỷ lệ hiển thị
}

// Database các model .glb có thể load (NEW DYNAMIC SYSTEM)
export const GLB_MODEL_DATABASE: { [key: string]: GLBModelConfig } = {
  'pikachu': {
    id: 'pikachu',
    name: 'Pikachu',
    filePath: 'assets/models/pikachu_sample.glb',
    scale: 0.06,
    position: { x: 0, y: -0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    animations: ['idle', 'walk', 'attack'], // Nếu có animation trong .glb
  },
  'raichu': {
    id: 'raichu',
    name: 'Raichu',
    filePath: 'assets/models/raichu_sample.glb', // File này chưa có
    scale: 0.04,
    position: { x: 0, y: -0.3, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    animations: ['idle', 'thunder'],
  },
  'scizor': {
    id: 'scizor',
    name: 'Scizor',
    filePath: 'assets/models/pokemon_concua/scene.gltf', // ✅ DÙNG GLTF ĐỂ GIỮ MÀU SẮC GỐC
    scale: 0.025, // ✅ TĂNG SCALE LÊN CHÚT ĐỂ RÕ HƠN
    position: { x: 0, y: 0, z: 0 }, // ✅ CHÍNH GIỮA MÀN HÌNH
    rotation: { x: 0, y: 0, z: 0 },
    animations: ['idle', 'attack', 'fly'],
  },
  'scizor_concua': {
    id: 'scizor_concua',
    name: 'Scizor (Pokemon Concua)',
    filePath: 'assets/models/pokemon_concua/scene.gltf',
    scale: 0.03,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    animations: ['idle', 'attack', 'fly'],
  },
  'charizard': {
    id: 'charizard',
    name: 'Charizard',
    filePath: 'assets/models/charizard_sample.glb', // File này chưa có
    scale: 0.03,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    animations: ['idle', 'fly', 'fire'],
  },
};

// Database các model 3D (hardcoded - LEGACY SUPPORT)
export const MODEL_DATABASE: { [key: string]: ModelData } = {
  'pikachu': {
    id: 'pikachu',
    name: 'Pikachu',
    modelPath: 'pikachu_sample.glb', // File trong assets/models/
    description: 'Pokémon điện hệ đáng yêu',
    scale: 0.04,
  },
  'raichu': {
    id: 'raichu',
    name: 'Raichu',
    modelPath: 'raichu.glb',
    description: 'Tiến hóa của Pikachu',
    scale: 0.03,
  },
  'scizor': {
    id: 'scizor',
    name: 'Scizor',
    modelPath: 'pokemon_scizor.glb',
    description: 'Pokémon côn trùng thép mạnh mẽ',
    scale: 0.04,
  },
  'scizor_concua': {
    id: 'scizor_concua',
    name: 'Scizor (Pokemon Concua)',
    modelPath: 'pokemon_concua/pokemon_scizor.glb',
    description: 'Pokémon Scizor từ Pokemon Concua collection',
    scale: 0.03,
  },
  'pokeball': {
    id: 'pokeball',
    name: 'Pokeball',
    modelPath: 'pokeball.glb',
    description: 'Quả cầu bắt Pokemon',
    scale: 0.04,
  },
};

/**
 * Get GLB model config by ID (NEW DYNAMIC SYSTEM)
 */
export function getGLBModelConfig(modelId: string): GLBModelConfig | null {
  return GLB_MODEL_DATABASE[modelId] || null;
}

/**
 * Get all available GLB models
 */
export function getAllGLBModels(): GLBModelConfig[] {
  return Object.values(GLB_MODEL_DATABASE);
}

/**
 * Check if model exists in GLB database
 */
export function isValidGLBModelId(modelId: string): boolean {
  return modelId in GLB_MODEL_DATABASE;
}

/**
 * Lấy thông tin model từ QR code data
 * @param qrData - Dữ liệu từ QR code (có thể là modelId hoặc JSON)
 * @returns ModelData hoặc null nếu không tìm thấy
 */
export const getModelFromQRData = (qrData: string): ModelData | null => {
  try {
    // Trường hợp 1: QR code chứa JSON
    // Format: {"modelId": "pikachu", "scale": 1.5}
    const parsed = JSON.parse(qrData);
    const modelId = parsed.modelId || parsed.id;
    
    if (modelId && MODEL_DATABASE[modelId]) {
      const model = { ...MODEL_DATABASE[modelId] };
      // Override scale nếu có trong QR
      if (parsed.scale) {
        model.scale = parsed.scale;
      }
      return model;
    }
  } catch {
    // Trường hợp 2: QR code chỉ chứa modelId đơn giản
    // Format: "pikachu"
    if (MODEL_DATABASE[qrData]) {
      return MODEL_DATABASE[qrData];
    }
  }
  
  return null;
};

/**
 * Get GLB model from QR data (NEW DYNAMIC SYSTEM)
 */
export const getGLBModelFromQRData = (qrData: string): GLBModelConfig | null => {
  try {
    // Trường hợp 1: QR code chứa JSON với GLB config
    const parsed = JSON.parse(qrData);
    const modelId = parsed.modelId || parsed.id;
    
    if (modelId && GLB_MODEL_DATABASE[modelId]) {
      const model = { ...GLB_MODEL_DATABASE[modelId] };
      
      // Override các thuộc tính nếu có trong QR
      if (parsed.scale) model.scale = parsed.scale;
      if (parsed.position) model.position = parsed.position;
      if (parsed.rotation) model.rotation = parsed.rotation;
      
      return model;
    }
  } catch {
    // Trường hợp 2: QR code chỉ chứa modelId đơn giản
    if (GLB_MODEL_DATABASE[qrData]) {
      return GLB_MODEL_DATABASE[qrData];
    }
  }
  
  return null;
};

/**
 * Tạo QR code data để test (dùng cho việc generate QR code)
 * @param modelId - ID của model
 * @param customScale - Scale tùy chỉnh (optional)
 * @returns String data cho QR code
 */
export const generateQRData = (modelId: string, customScale?: number): string => {
  if (!MODEL_DATABASE[modelId] && !GLB_MODEL_DATABASE[modelId]) {
    throw new Error(`Model ${modelId} không tồn tại`);
  }
  
  if (customScale) {
    return JSON.stringify({
      modelId,
      scale: customScale,
    });
  }
  
  // Trả về modelId đơn giản
  return modelId;
};

/**
 * Lấy tất cả model IDs
 */
export const getAllModelIds = (): string[] => {
  // Kết hợp cả legacy và GLB models
  const legacyIds = Object.keys(MODEL_DATABASE);
  const glbIds = Object.keys(GLB_MODEL_DATABASE);
  return [...new Set([...legacyIds, ...glbIds])];
};

/**
 * Get model info for both systems
 */
export function getModelInfo(modelId: string) {
  const glbConfig = getGLBModelConfig(modelId);
  const legacyConfig = MODEL_DATABASE[modelId];
  
  return {
    glb: glbConfig,
    legacy: legacyConfig,
    hasGLB: !!glbConfig,
    hasLegacy: !!legacyConfig,
    exists: !!glbConfig || !!legacyConfig,
  };
}

/**
 * Ví dụ QR code data để test:
 * 
 * 1. QR đơn giản: "pikachu"
 * 2. QR với JSON: {"modelId":"pikachu","scale":1.5}
 * 3. QR với metadata: {"modelId":"raichu","scale":2.0}
 */

// Export các QR data mẫu để test
export const SAMPLE_QR_DATA = {
  pikachu: 'pikachu',
  raichu: 'raichu',
  scizor: 'scizor',
  pikachuLarge: JSON.stringify({ modelId: 'pikachu', scale: 2.0 }),
  raichuSmall: JSON.stringify({ modelId: 'raichu', scale: 0.8 }),
  // GLB samples
  pikachuGLB: JSON.stringify({ 
    modelId: 'pikachu', 
    scale: 0.04,
    position: { x: 0, y: -0.2, z: 0 }
  }),
  scizorGLB: JSON.stringify({ 
    modelId: 'scizor', 
    scale: 0.03,
    rotation: { x: 0, y: Math.PI / 4, z: 0 }
  }),
  charizardGLB: JSON.stringify({ 
    modelId: 'charizard', 
    scale: 0.06,
    rotation: { x: 0, y: Math.PI / 4, z: 0 }
  }),
};