import React, {useEffect, useState} from 'react';
import {GLView} from "expo-gl";
import {
    TextGeometry,
    AmbientLight,
    DirectionalLight,
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    PerspectiveCamera,
    Scene,
    BufferGeometry,
    LineBasicMaterial,
    Line,
    LineSegments,
    PlaneGeometry,
    Vector3,
    Float32BufferAttribute,
    VertexColors,
    Color,
    BoxBufferGeometry,
    MeshStandardMaterial
} from 'three';
import {
    ActivityIndicator,
    StyleSheet,
    Pressable,
    Text,
    View,
    Image,
    Platform,
    ActivityIndicatorComponent,
    useWindowDimensions,
    PixelRatio
} from 'react-native';
import {Renderer} from "expo-three";
import {Asset} from "expo-asset";

const currentGame = {};

const assetCache = {
    'redButton': Asset.fromModule(require('../assets/png/redButton.png'))
}
const loadAssets = () => {
    const promiseArr = [];
    Object.values(assetCache).forEach(asset => {
        promiseArr.push(new Promise((resolve, reject) => {
            asset
                .downloadAsync()
                .then(asset => {
                    resolve(asset);
                })
                .catch(err => reject(err));
        }));
    });
    return Promise.all(promiseArr);
}

const prepareScene = (gl, container, sceneColor) => {
    const {drawingBufferWidth: width, drawingBufferHeight: height} = gl;
    const renderer = new Renderer({gl});
    renderer.setSize(width, height);
    renderer.physicallyCorrectLights = true;
    renderer.setClearColor(sceneColor);

    const camera = new PerspectiveCamera(
        35, // fov = Field Of View
        1, // aspect ratio (dummy value)
        0.1, // near clipping plane
        100, // far clipping plane
    );

    // move the camera back so we can view the scene
    camera.position.set(0, 0, 10);
    const scene = new Scene();
    scene.add(camera);

    const light = new DirectionalLight('white', 8);
    light.position.set(10, 0, 10);
    scene.add(light);

    return {scene, camera, renderer};
}

const onContextCreate = (gl, container) => {
    currentGame.stageInfo = prepareScene(gl, container, 0xcccccc);
    const {scene, camera, renderer} = currentGame.stageInfo;

    const geometry = new BoxBufferGeometry(2, 2, 2);
    const material = new MeshStandardMaterial({color: 'purple'});
    const cube = new Mesh(geometry, material);
    cube.rotation.set(-0.5, -0.1, 0.8);
    scene.add(cube)
}

export default function JoinTournament() {

    const [assetsLoaded, setAssetsLoaded] = useState(false);
    const width= useWindowDimensions().width - 100;
    const height= useWindowDimensions().height - 100;
    const pr= PixelRatio.get();

    const resize = () => {
        const {scene, camera, renderer} = currentGame.stageInfo;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        renderer.setPixelRatio(pr);
    }

    currentGame.container = {
    }

    loadAssets().then(() => {
        setAssetsLoaded(true);
    });

    currentGame.render = (millis) => {
        if (currentGame.render) {
            currentGame.timeout = requestAnimationFrame(currentGame.render);
        }
        if (currentGame.stageInfo && assetsLoaded) {
            resize();
            currentGame.stageInfo.renderer.render(currentGame.stageInfo.scene, currentGame.stageInfo.camera);
            currentGame.stageInfo.renderer.getContext().endFrameEXP();
        }
    }

    currentGame.render();

    let gameView = (
        <View style={{flex: 1, height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center'}}>
            <GLView style={{height, width}}
                    onContextCreate={onContextCreate}
            />
        </View>
    );

    if (assetsLoaded)
        return gameView;
    else
        return <ActivityIndicator/>
}

