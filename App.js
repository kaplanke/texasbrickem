import {StatusBar} from 'expo-status-bar';
import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, Text, View, SafeAreaView, ImageBackground} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ScreenTemplate from "./screens/_screenTemplate";
import SingleGame from "./screens/singleGame";

export default function App() {

    const Stack = createNativeStackNavigator();

    function MainPage({navigation}) {
        return (
            <SafeAreaView style={{flex: 1, width: '100%', height: '100%'}}>
                <ImageBackground
                    style={{flex: 1, width: '100%', height: '100%',  alignItems: 'center',
                        justifyContent: 'center'}}
                    imageStyle={{resizeMode: 'repeat'}}
                    source={require('./assets/bg.png')}>

                    <TouchableOpacity
                        style={styles.mpButton}
                        onPress={() => {
                            navigation.navigate('SingleGame')
                        }}
                    ><Text style={styles.mpButtonText}>Single Game</Text></TouchableOpacity>
                    <TouchableOpacity
                        style={styles.mpButton}
                        onPress={() => {
                        }}
                    ><Text style={styles.mpButtonText}>Join Tournament</Text></TouchableOpacity>
                    <StatusBar style="auto"/>
                </ImageBackground>
            </SafeAreaView>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{headerShown: false}}>
                <Stack.Screen name="Home" component={MainPage}/>
                <Stack.Screen name="SingleGame" component={ScreenTemplate}/>
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    mpButton: {
        width: "50%",
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#828',
        height: 40,
        marginBottom: 10
    },
    mpButtonText: {
        color: '#fff',
    }
});
