import React from 'react';
import { Button, Image, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

const PlatFormScreen = () => {
    const onPressButton = () => {
        console.log(`gut job`)
    }

    return (
        <View style={styles.container}>
            {/* <Text>Welcome to React Native!</Text>
            <Text>Current Platform : {Platform.OS}</Text>

            <View>
                <Text>Hello world</Text>
            </View>
            <View>
                <Text>Hello world</Text>
            </View>
            <View>
                <Text>Hello world</Text>
            </View>
            <View>
                <Text>Hello world</Text>
            </View> */}


            {/* <Text>Demo button</Text>
            <Button title='clickMe' color='red' onPress={() => alert(' Why you click me bro ???')} /> */}

            <Text
                style={{ paddingTop: 100, fontSize: 36 }}
            >Demo Image</Text>
            <View style={styles.container}>
                <Image source={require('../styles/img/image.png')}
                    style={{ width: 600, height: 700 }}

                    resizeMode='contain'
                />
            </View>



        </View>


    );
};

const styles = StyleSheet.create({
    container: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {

                backgroundColor: 'white',
            },
            android: {
                backgroundColor: 'green',
            },
            default: {
                // for web or other platforms
                backgroundColor: 'red',
            },
        }),
    },
});

export default PlatFormScreen;