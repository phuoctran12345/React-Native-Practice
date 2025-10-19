import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

interface SketchfabViewerProps {
  modelId: string;
  title?: string;
  height?: number;
}

const SketchfabViewer: React.FC<SketchfabViewerProps> = ({ 
  modelId, 
  title = "3D Model",
  height = 300 
}) => {
  // Tạo HTML để nhúng Sketchfab model
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #000;
          overflow: hidden;
        }
        .sketchfab-embed-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }
        iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      </style>
    </head>
    <body>
      <div class="sketchfab-embed-wrapper">
        <iframe 
          title="${title}" 
          frameborder="0" 
          allowfullscreen 
          mozallowfullscreen="true" 
          webkitallowfullscreen="true" 
          allow="autoplay; fullscreen; xr-spatial-tracking" 
          xr-spatial-tracking 
          execution-while-out-of-viewport 
          execution-while-not-rendered 
          web-share 
          src="https://sketchfab.com/models/${modelId}/embed">
        </iframe>
      </div>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
  },
  webview: {
    flex: 1,
  },
});

export default SketchfabViewer;
