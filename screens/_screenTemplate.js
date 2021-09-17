import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, Text, View} from 'react-native';
import {AntDesign} from '@expo/vector-icons';
import * as allScreens from "./_index";

export default function ScreenTemplate({route, navigation}) {
    const InnerComponent = allScreens[route.name];
    return (
        <View style={{flex: 1}}>
            <View style={{flex: 1}}/>
            <View style={{
                height: 30,
                flexDirection: 'row',
                padding:5
            }}>
                <View style={{flex: 3, height: 30}}>
                    <TouchableOpacity
                        onPress={() => {
                            navigation.goBack();
                        }} >
                        <View style={{
                            width: 100,
                            height: 30,
                            flexDirection: 'row',
                        }}>
                            <AntDesign name="leftcircle" size={24} color="black" style={{flex: 1}}/>
                            <Text style={{flex: 3, fontSize: 17}}>Back</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={{flex: 15}}/>
            </View>
            <View style={{
                flex: 15,
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <InnerComponent></InnerComponent>
            </View>
        </View>

    );
}

