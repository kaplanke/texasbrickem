import React, {useState, useEffect} from 'react';
import {StyleSheet, TouchableOpacity, Text, View, Image} from 'react-native';
import {GLView} from 'expo-gl';
import {Asset} from 'expo-asset';
import {Renderer, TextureLoader} from 'expo-three';
import {rotate90, rotate270} from '2d-array-rotation';
import {Audio} from 'expo-av';
import {
    FontLoader,
    TextGeometry,
    AmbientLight,
    GridHelper,
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    Scene,
    Shape,
    ShapeGeometry,
    PlaneGeometry,
    Vector3
} from 'three';

function random(maxExclude) {
    return Math.floor(Math.random() * maxExclude);
}

const TBBRICKS_TEMPLATES = [
    [
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0]

    ],
    [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0],
        [0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]

    ],
    [
        [0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0],
        [0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
    ],
    [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0]
    ],
    [
        [0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0]
    ],
    [
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
    ],
    [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0]
    ]
]

const TB_SUITS = {
    suits: ['D', 'H', 'C', 'S'],
    S_D: 'D',
    S_H: 'H',
    S_C: 'C',
    S_S: 'S'
}

const TB_RANKS = {
    ranks: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    R_A: 'A',
    R_2: '2',
    R_3: '3',
    R_4: '4',
    R_5: '5',
    R_6: '6',
    R_7: '7',
    R_8: '8',
    R_9: '9',
    R_10: '10',
    R_J: 'J',
    R_Q: 'Q',
    R_K: 'K'
}

class TBGame {
    board;
    point;
    height;
    width;
    unitSize;
    currentBrick;
    nextBrick;
    scene;
    isOver;

    constructor(scene, height, width, unitSize) {
        this.height = height;
        this.width = width;
        this.board = [];
        this.point = 0;
        this.unitSize = unitSize;
        this.scene = scene;

        for (let i = -width / 2; i < width / 2; i++) {
            for (let j = -height / 2; j < height / 2; j++) {
                if (i == -width / 2 || i == width / 2 - 1 || j == -height / 2)
                    new TBWall(this).draw(i, j);
                else {
                    if ((i + j) % 2)
                        new Drawable(this, null, 0x0000FF, 1, true).draw(i, j);
                    else
                        new Drawable(this, null, 0x0000AA, 1, true).draw(i, j);
                }
            }
        }
        console.log("Game started ", height, width, unitSize);

    }
};

class TBBrick {
    game;
    matrix = [];

    static generate(game) {
        const template = rotate90(TBBRICKS_TEMPLATES[random(TBBRICKS_TEMPLATES.length)]);
        const ret = new TBBrick();
        ret.game = game;
        ret.matrix = new Array(template.length).fill(null).map(x => new Array(template.length).fill(null));
        template.forEach(
            (x, xIdx) => x.forEach(
                (y, yIdx) => {
                    y ? ret.matrix[xIdx][yIdx] = TBCard.generate(game) : null;
                }
            )
        );
        return ret;
    }

    remove() {
        this.matrix.flat().forEach(d => d && d.destructor());
    }

    draw() {
        this.matrix.forEach(
            (x, xIdx) => x.forEach(
                (y, yIdx) => {
                    if (y) {
                        y.draw(xIdx, yIdx);
                    }
                }
            )
        );
        return this.move(-2, this.game.height / 2 - 4);
    };

    move(xDelta, yDelta) {

        //detect collision
        const fm = this.matrix.flat();
        if (fm.find(m => {
            return m && this.game.board.find(b =>
                b.x === (m.x + xDelta) &&
                b.y === (m.y + yDelta) &&
                !fm.find(m2 => m2 === b))
        })) return false;

        this.matrix.forEach(
            (x, xIdx) => x.forEach(
                (y, yIdx) => {
                    if (y) {
                        y.setPos(y.x + xDelta, y.y + yDelta);
                    }
                }
            )
        );
        return true;
    };

    rotate() {

        //detect collision
        const tmpMatrix = rotate90(this.matrix);
        let willCollide = false;
        tmpMatrix.forEach(
            (x, xIdx) => x.forEach(
                (y, yIdx) => {
                    if (y) {
                        let xPos = tmpMatrix[2][2].x - 2 - tmpMatrix.length + 5;
                        let yPos = tmpMatrix[2][2].y - 2;
                        if (
                            this.game.board.find(b =>
                                b.x === (xPos + xIdx) &&
                                b.y === (yPos + yIdx) &&
                                !tmpMatrix.flat().find(m2 => m2 === b))
                        ) willCollide = true;
                    }
                }
            )
        );
        if (willCollide)
            return false;

        this.matrix = rotate90(this.matrix);
        this.matrix.forEach(
            (x, xIdx) => x.forEach(
                (y, yIdx) => {
                    if (y) {
                        let xPos = this.matrix[2][2].x - 2 - this.matrix.length + 5;
                        let yPos = this.matrix[2][2].y - 2;
                        y.setPos(xPos + xIdx, yPos + yIdx);
                    }
                }
            )
        );
        return true;
    };
}

class Drawable {
    plane;
    x;
    y;
    game;

    constructor(game, asset, color, opacity, ignore) {
        this.game = game;
        let unitMaterial;
        if (asset) {
            const texture = new TextureLoader().load(asset);
            unitMaterial = new MeshBasicMaterial({map: texture});
        } else {
            unitMaterial = new MeshBasicMaterial({color: color, opacity: opacity});
        }
        this.plane = new Mesh(new PlaneGeometry(this.game.unitSize, this.game.unitSize), unitMaterial);
        if (!ignore)
            game.board.push(this);
    }

    destructor() {
        this.game.scene.remove(this.plane);
        this.game.board = this.game.board.filter(x => x !== this);
    }

    draw(x, y) {
        this.game.scene.add(this.plane);
        this.setPos(x, y);
    };

    setPos(x, y) {
        this.plane.position.x = x * this.game.unitSize + this.game.unitSize / 2;
        this.plane.position.y = y * this.game.unitSize + this.game.unitSize / 2;
        this.x = x;
        this.y = y;
    }

    setPosDelta(xDelta, yDelta) {
        this.setPos(this.x + xDelta, this.y + yDelta);
    }

}

class TBCard extends Drawable {
    suit;
    rank;

    constructor(game, rank, suit) {
        super(game, assetCache["img" + rank + suit]);
        this.rank = rank;
        this.suit = suit;
    }

    static generate(game) {
        const suit = TB_SUITS.suits[random(TB_SUITS.suits.length)];
        const rank = TB_RANKS.ranks[random(TB_RANKS.ranks.length)];
        const ret = new TBCard(game, rank, suit);
        return ret;
    }

};

class TBWall extends Drawable {
    plane;
    x;
    y;

    constructor(game) {
        super(game, Asset.fromModule(require('../assets/png/wall.png')));
    }
};


const currentGame = {};
const assetCache = {
    'img2C': Asset.fromModule(require('../assets/png/2C.png')),
    'img2D': Asset.fromModule(require('../assets/png/2D.png')),
    'img2H': Asset.fromModule(require('../assets/png/2H.png')),
    'img2S': Asset.fromModule(require('../assets/png/2S.png')),
    'img3C': Asset.fromModule(require('../assets/png/3C.png')),
    'img3D': Asset.fromModule(require('../assets/png/3D.png')),
    'img3H': Asset.fromModule(require('../assets/png/3H.png')),
    'img3S': Asset.fromModule(require('../assets/png/3S.png')),
    'img4C': Asset.fromModule(require('../assets/png/4C.png')),
    'img4D': Asset.fromModule(require('../assets/png/4D.png')),
    'img4H': Asset.fromModule(require('../assets/png/4H.png')),
    'img4S': Asset.fromModule(require('../assets/png/4S.png')),
    'img5C': Asset.fromModule(require('../assets/png/5C.png')),
    'img5D': Asset.fromModule(require('../assets/png/5D.png')),
    'img5H': Asset.fromModule(require('../assets/png/5H.png')),
    'img5S': Asset.fromModule(require('../assets/png/5S.png')),
    'img6C': Asset.fromModule(require('../assets/png/6C.png')),
    'img6D': Asset.fromModule(require('../assets/png/6D.png')),
    'img6H': Asset.fromModule(require('../assets/png/6H.png')),
    'img6S': Asset.fromModule(require('../assets/png/6S.png')),
    'img7C': Asset.fromModule(require('../assets/png/7C.png')),
    'img7D': Asset.fromModule(require('../assets/png/7D.png')),
    'img7H': Asset.fromModule(require('../assets/png/7H.png')),
    'img7S': Asset.fromModule(require('../assets/png/7S.png')),
    'img8C': Asset.fromModule(require('../assets/png/8C.png')),
    'img8D': Asset.fromModule(require('../assets/png/8D.png')),
    'img8H': Asset.fromModule(require('../assets/png/8H.png')),
    'img8S': Asset.fromModule(require('../assets/png/8S.png')),
    'img9C': Asset.fromModule(require('../assets/png/9C.png')),
    'img9D': Asset.fromModule(require('../assets/png/9D.png')),
    'img9H': Asset.fromModule(require('../assets/png/9H.png')),
    'img9S': Asset.fromModule(require('../assets/png/9S.png')),
    'img10C': Asset.fromModule(require('../assets/png/10C.png')),
    'img10D': Asset.fromModule(require('../assets/png/10D.png')),
    'img10H': Asset.fromModule(require('../assets/png/10H.png')),
    'img10S': Asset.fromModule(require('../assets/png/10S.png')),
    'imgAC': Asset.fromModule(require('../assets/png/AC.png')),
    'imgAD': Asset.fromModule(require('../assets/png/AD.png')),
    'imgAH': Asset.fromModule(require('../assets/png/AH.png')),
    'imgAS': Asset.fromModule(require('../assets/png/AS.png')),
    'imgJC': Asset.fromModule(require('../assets/png/JC.png')),
    'imgJD': Asset.fromModule(require('../assets/png/JD.png')),
    'imgJH': Asset.fromModule(require('../assets/png/JH.png')),
    'imgJS': Asset.fromModule(require('../assets/png/JS.png')),
    'imgKC': Asset.fromModule(require('../assets/png/KC.png')),
    'imgKD': Asset.fromModule(require('../assets/png/KD.png')),
    'imgKH': Asset.fromModule(require('../assets/png/KH.png')),
    'imgKS': Asset.fromModule(require('../assets/png/KS.png')),
    'imgQC': Asset.fromModule(require('../assets/png/QC.png')),
    'imgQD': Asset.fromModule(require('../assets/png/QD.png')),
    'imgQH': Asset.fromModule(require('../assets/png/QH.png')),
    'imgQS': Asset.fromModule(require('../assets/png/QS.png')),
};

export default function SingleGame() {

    function _loadAssets() {
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


    function onContextCreate(gl) {

        const {drawingBufferWidth: width, drawingBufferHeight: height} = gl;
        const sceneColor = 0x0000ff;
        const renderer = new Renderer({gl});
        renderer.setSize(width, height);
        renderer.setClearColor(sceneColor);

        const camera = new OrthographicCamera(
            width / -2, width / 2, height / 2, height / -2, -100, height);
        camera.position.x = 0;
        camera.position.y = 0;
        camera.position.z = height;
        camera.lookAt(new Vector3(0, 0, 0));
        const scene = new Scene();
        scene.add(camera);

        const divisions = 24;
        const ambientLight = new AmbientLight(0xFFFFFF);
        scene.add(ambientLight);
        const unitSize = height / divisions;

        _loadAssets().then(assets => {
            const game = new TBGame(scene, Math.floor(height / unitSize), Math.floor(width / unitSize), unitSize);
            game.currentBrick = TBBrick.generate(game);
            game.currentBrick.draw();
            game.nextBrick = TBBrick.generate(game);
            currentGame["game"] = game;

            currentGame["interval"] = setInterval(() => {
                if (!game.currentBrick.move(0, -1) && !currentGame.game.isOver) {
                    checkLine();
                    game.currentBrick = game.nextBrick;
                    if (!game.currentBrick.draw()) {
                        game.currentBrick.remove();
                        gameOver();
                    }
                    game.nextBrick = TBBrick.generate(game);
                }
                ;
            }, 1000);
        });

        const render = (millis) => {
            currentGame["timeout"] = requestAnimationFrame(render);
            //update();
            renderer.render(scene, camera);
            gl.endFrameEXP();
        };
        render();
    }

    useEffect(() => {
        let soundHandler;
        window !== undefined && window.addEventListener("keydown", onKeyDown);
        new Audio.Sound.createAsync(
            require('../assets/Tetris.mp3'), {shouldPlay: true, isLooping: true}
        ).then(({sound, status}) => {
            soundHandler = sound;
        });

        return () => {
            window !== undefined && window.removeEventListener("keydown", onKeyDown);
            currentGame.timeout && cancelAnimationFrame(currentGame.timeout);
            currentGame.interval && clearInterval(currentGame.interval);
            soundHandler.unloadAsync().catch(err => {
                console.log("Unload warning: " + err)
            });
        };
    }, []);

    function gameOver() {
        currentGame.game.isOver = true;
        console.log("Game over...");
    }

    function checkLine() {
        const tmpHist = {};
        const linesToRemove = [];
        currentGame.game.board.forEach(d => {
            if (d instanceof TBCard) {
                tmpHist[d.y] = tmpHist[d.y] ? tmpHist[d.y] + 1 : 1;
                if (tmpHist[d.y] === currentGame.game.width - 2) {
                    linesToRemove.push(d.y);
                }
            }
        });
        if (linesToRemove.length > 0) {
            //TODO:poker
            linesToRemove.sort((a, b) => b - a);
            linesToRemove.forEach(l => {
                currentGame.game.board.forEach(d => {
                    if ((d instanceof TBCard) && d.y === l)
                        d.destructor();
                });
                currentGame.game.board.forEach(d => {
                    if (d.y > l && (d instanceof TBCard))
                        d.setPos(d.x, d.y - 1);
                });
            });
        }
    }

    function onDropClick(event) {
        while (currentGame.game.currentBrick.move(0, -1)) ;
    };

    function onLeftClick(event) {
        currentGame.game.currentBrick.move(-1, 0);
    };

    function onRightClick(event) {
        currentGame.game.currentBrick.move(1, 0);
    };

    function onDownClick(event) {
        currentGame.game.currentBrick.move(0, -1);
    };

    function onRotateClick(event) {
        currentGame.game.currentBrick.rotate();
    };

    function onKeyDown(event) {
        if ("ArrowLeft" === event.key) {
            onLeftClick(event);
            return;
        }
        if ("ArrowRight" === event.key) {
            onRightClick(event);
            return;
        }
        if ("ArrowDown" === event.key) {
            onDownClick(event);
            return;
        }
        if ("ArrowUp" === event.key) {
            onRotateClick(event);
            return;
        }
        if ("Enter" === event.key || " " === event.key) {
            onDropClick(event);
            return;
        }
    }

    return (

        <View style={{flex: 1}} onKeyPress={onKeyDown}>
            <View style={{flex: 1}}></View>
            <View style={{height: 500}}>
                <GLView style={{height: 500, width: 250}}
                        onContextCreate={onContextCreate}
                />
            </View>
            <View style={{height: 120, marginTop:10}}>
                <View style={{flex: 1, flexDirection: 'row', height: 50}}>
                    <View style={{flex: 5, flexDirection: 'column'}}>
                        <View style={{flex: 1}}/>
                        <View style={{flex: 4}}>
                            <TouchableOpacity style={styles.button} onPress={onDropClick}>
                                <Image style={styles.buttonImg} source={require('../assets/png/redButton.png')}/>
                            </TouchableOpacity>
                        </View>
                        <View style={{flex: 1}}/>
                    </View>
                    <View style={{flex: 1}}/>
                    <View style={{flex: 3, flexDirection: 'column'}}>
                        <View style={{flex: 1}}/>
                        <View style={{flex: 2}}>
                            <TouchableOpacity style={styles.button} onPress={onLeftClick}>
                                <Image style={styles.buttonImg} source={require('../assets/png/grayButton.png')}/>
                            </TouchableOpacity>
                        </View>
                        <View style={{flex: 1}}/>
                    </View>
                    <View style={{flex: 3, flexDirection: 'column'}}>
                        <View style={{flex: 2}}>
                            <TouchableOpacity style={styles.button} onPress={onRotateClick}>
                                <Image style={styles.buttonImg} source={require('../assets/png/grayButton.png')}/>
                            </TouchableOpacity>
                        </View>
                        <View style={{flex: 2}}>
                            <TouchableOpacity style={styles.button} onPress={onDownClick}>
                                <Image style={styles.buttonImg} source={require('../assets/png/grayButton.png')}/>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={{flex: 3, flexDirection: 'column'}}>
                        <View style={{flex: 1}}/>
                        <View style={{flex: 2}}>
                            <TouchableOpacity style={styles.button} onPress={onRightClick}>
                                <Image style={styles.buttonImg} source={require('../assets/png/grayButton.png')}/>
                            </TouchableOpacity>
                        </View>
                        <View style={{flex: 1}}/>
                    </View>
                </View>
            </View>
        </View>
    );


}
const styles = StyleSheet.create({
    button: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        padding: 0,
        margin: 0,
    },
    buttonImg: {
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        resizeMode: "stretch"
    }
});

/*new FontLoader().load(require('../assets/Arial.json'), function (font) {
const geometry = new TextGeometry('Hello world!', {
font,
size: 50,
height: 20,
color: 'red'
});
let tmp = new Mesh(geometry, material);
tmp.rotation.z = -Math.PI / 2;
tmp.position.x = 0;
tmp.position.y = 0;
scene.add(tmp);
});*/

/*
const unitShape = new Shape();
unitShape
.moveTo(height / 2, 0)
.lineTo(unitShape.currentPoint.x - unitSize, unitShape.currentPoint.y)
.lineTo(unitShape.currentPoint.x, unitShape.currentPoint.y - unitSize)
.lineTo(unitShape.currentPoint.x + unitSize, unitShape.currentPoint.y)
.lineTo(unitShape.currentPoint.x, unitShape.currentPoint.y + unitSize);
const unitMesh = new Mesh(new ShapeGeometry(unitShape), unitMaterial);
unitMesh.rotation.z = Math.PI / 2;
scene.add(unitMesh);*/

/*
const borders = new Shape();
borders.moveTo(-height / 2, -width / 2)
.lineTo(height / 2, -width / 2)
.lineTo(height / 2, width / 2)
.lineTo(-height / 2, width / 2)
.lineTo(-height / 2, -width / 2);
const bordersIn = new Shape();
bordersIn.moveTo(-height / 2 + yOff, -width / 2 + xOff)
.lineTo(height / 2, -width / 2 + xOff)
.lineTo(height / 2, width / 2 - xOff)
.lineTo(-height / 2 + yOff, width / 2 - xOff)
.lineTo(-height / 2 + yOff, -width / 2 + xOff);
borders.holes.push(bordersIn);
const material = new MeshBasicMaterial({color: 0x00ff00});
const mesh = new Mesh(new ShapeGeometry(borders), material);
mesh.rotation.z = Math.PI / 2;
scene.add(mesh);
*/
