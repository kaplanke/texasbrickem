import {StatusBar} from 'expo-status-bar';
import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, Text, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ScreenTemplate from "./screens/_screenTemplate";
import SingleGame from "./screens/singleGame";

export default function App() {

    const Stack = createNativeStackNavigator();

    function MainPage({navigation}) {
        return (
            <View style={styles.mp}>
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
            </View>
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
    mp: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
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
