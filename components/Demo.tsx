import { Component } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import SketchfabViewer from "./SketchfabViewer";

class Demo extends Component {
    render() {
        return (
            <ScrollView style={styles.container}>
                <Text style={styles.title}>
                    🎮 Model 3D Pikachu VS Raichu
                </Text>
                
                <Text style={styles.subtitle}>
                    Xoay và phóng to để xem chi tiết model 3D
                </Text>

                <SketchfabViewer 
                    modelId="c461e00264ab457e964a3755b81b5f8f"
                    title="Pikachu VS Raichu - pokemon"
                    height={400}
                />

                <Text style={styles.description}>
                    💡 Hướng dẫn: Chạm và kéo để xoay model, pinch để zoom in/out
                </Text>
            </ScrollView>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 10,
        marginTop: 50,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    description: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
});

export default Demo;