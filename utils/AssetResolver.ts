import { Asset } from 'expo-asset';

// Asset Resolver cho Pokemon Models
export class AssetResolver {
  private static instance: AssetResolver;
  private assetCache: Map<string, Asset> = new Map();

  static getInstance(): AssetResolver {
    if (!AssetResolver.instance) {
      AssetResolver.instance = new AssetResolver();
    }
    return AssetResolver.instance;
  }

  /**
   * Resolve asset từ file path
   */
  async resolveAsset(filePath: string): Promise<string> {
    try {
      console.log(`🔍 Resolving asset: ${filePath}`);
      
      // Check cache
      if (this.assetCache.has(filePath)) {
        const cachedAsset = this.assetCache.get(filePath)!;
        console.log(`✅ Using cached asset: ${cachedAsset.localUri}`);
        return cachedAsset.localUri!;
      }

      // Resolve asset dựa trên file path
      // ✅ DYNAMIC ASSET RESOLVER - KHÔNG HARDCODE!
      console.log(`🔄 Dynamic asset resolution for: ${filePath}`);
      
      // Tạo asset từ file path dynamic
      const asset = new Asset({
        name: filePath.split('/').pop() || 'model',
        type: filePath.endsWith('.glb') ? 'glb' : 
              filePath.endsWith('.gltf') ? 'gltf' : 
              filePath.endsWith('.bin') ? 'bin' : 'unknown',
        uri: filePath,
      });
      
      // Download asset
      await asset.downloadAsync();
      
      // Cache asset
      this.assetCache.set(filePath, asset);
      
      console.log(`✅ Asset resolved: ${asset.localUri}`);
      return asset.localUri!;
      
    } catch (error) {
      console.error(`❌ Error resolving asset ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.assetCache.clear();
    console.log('🗑️ Asset cache cleared');
  }

  /**
   * Get cache info
   */
  getCacheInfo() {
    return {
      cachedAssets: Array.from(this.assetCache.keys()),
      cacheSize: this.assetCache.size,
    };
  }
}

// Export singleton
export const assetResolver = AssetResolver.getInstance();
