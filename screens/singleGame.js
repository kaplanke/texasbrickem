import React, {useEffect} from 'react';
import {StyleSheet, TouchableOpacity, View, Image} from 'react-native';
import {GLView} from 'expo-gl';
import {Asset} from 'expo-asset';
import {Renderer, TextureLoader} from 'expo-three';
import {rotate90} from '2d-array-rotation';
import {Audio} from 'expo-av';
import {
    TextGeometry,
    AmbientLight,
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    Scene,
    BufferGeometry,
    LineBasicMaterial,
    Line,
    LineSegments,
    PlaneGeometry,
    Vector3,
    Float32BufferAttribute,
    VertexColors,
    Color
} from 'three';
import {ExpoFonts} from "../assets/fonts";
import Poker from "../engine/poker";

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

class TBGame {
    board;
    point;
    height;
    width;
    unitSize;
    currentBrick;
    nextBrick;
    isOver;
    stageInfo;
    stagePlay;
    msgMesh;
    lastMsg;

    constructor(stagePlay, stageInfo) {

        const DIVISIONS = 22;
        this.stagePlay = stagePlay;
        this.stageInfo = stageInfo;
        const tmpHeight = this.stagePlay.renderer.getContext().drawingBufferHeight;
        const tmpWidth = this.stagePlay.renderer.getContext().drawingBufferWidth;
        this.unitSize = tmpHeight / DIVISIONS;
        this.height = Math.floor(tmpHeight / this.unitSize)
        this.width = Math.floor(tmpWidth / this.unitSize)
        this.board = [];
        this.point = 0;

        for (let i = -this.width / 2; i < this.width / 2; i++) {
            for (let j = -this.height / 2; j < this.height / 2; j++) {
                if (i == -this.width / 2 || i == this.width / 2 - 1 || j == -this.height / 2)
                    new TBWall(this, this.stagePlay).draw(i, j);
                else {
                    if ((i + j) % 2)
                        new Drawable(this, this.stagePlay, null, 0x0000FF, 1, true).draw(i, j);
                    else
                        new Drawable(this, this.stagePlay, null, 0x0000AA, 1, true).draw(i, j);
                }
            }
        }

        console.log("Game started ", this.height, this.width, this.unitSize);
    }

    setMsg(msg, color) {
        if (this.msgMesh && msg === this.lastMsg) {
            return;
        }
        this.msgMesh && this.stageInfo.scene.remove(this.msgMesh)
        const infoHeight = this.stageInfo.renderer.getContext().drawingBufferHeight;
        const infoWidth = this.stageInfo.renderer.getContext().drawingBufferWidth;
        const geometry = new TextGeometry(msg, {
            font: ExpoFonts.helvetiker_bold,
            size: 10,
            height: 5,
        });
        this.msgMesh = new Mesh(geometry, new MeshBasicMaterial({color}));
        this.msgMesh.position.y = -infoHeight / 2 + 50;
        this.msgMesh.position.x = -infoWidth / 2 + 2;
        this.stageInfo.scene.add(this.msgMesh);
    }
}


class TBBrick {
    game;
    stage;
    matrix = [];

    static generate(game, stage) {
        const template = rotate90(TBBRICKS_TEMPLATES[random(TBBRICKS_TEMPLATES.length)]);
        const ret = new TBBrick();
        ret.game = game;
        ret.stage = stage;
        ret.matrix = new Array(template.length).fill(null).map(() => new Array(template.length).fill(null));
        template.forEach(
            (x, xIdx) => x.forEach(
                (y, yIdx) => {
                    y ? ret.matrix[xIdx][yIdx] = TBCard.generate(game, stage) : null;
                }
            )
        );
        return ret;
    }

    /*remove() {
        this.matrix.flat().forEach(d => d && d.destructor());
    }*/

    makePassive() {
        this.matrix.flat().forEach(d => d && d.makePassive());
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
        return this.move(-2, this.game.height / 2 - 4, true);
    };

    move(xDelta, yDelta, forceDraw) {

        //detect collision
        const fm = this.matrix.flat();
        const collidesWith = fm.find(m => {
            return m && this.game.board.find(b =>
                b.x === (m.x + xDelta) &&
                b.y === (m.y + yDelta) &&
                !fm.find(m2 => m2 === b))
        });

        if (!forceDraw && collidesWith)
            return false;

        this.matrix.forEach(
            (x) => x.forEach(
                (y) => {
                    if (y) {
                        y.setPos(y.x + xDelta, y.y + yDelta);
                    }
                }
            )
        );
        return collidesWith ? false : true;
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
    line;
    stage;

    constructor(game, stage, asset, color, opacity, ignore, lineColor, lineAnimated) {
        this.game = game;
        this.stage = stage;
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
        if (lineColor)
            this.line = this.renderLine(lineColor, lineAnimated);
    }

    renderLine(color, animated) {
        const unitSize = this.game.unitSize;
        const points = [
            new Vector3(-unitSize / 2, -unitSize / 2, 0),
            new Vector3(unitSize / 2, -unitSize / 2, 0),
            new Vector3(unitSize / 2, unitSize / 2, 0),
            new Vector3(-unitSize / 2, unitSize / 2, 0),
            new Vector3(-unitSize / 2, -unitSize / 2, 0)
        ];
        if (animated) {
            const colors = [];
            const tmpPoints = points.map((point, idx) => {
                const tmp = [];
                let delta;
                if (idx == 0) {
                    delta = new Vector3(unitSize / 10, 0, 0);
                }
                if (idx == 1) {
                    delta = new Vector3(0, unitSize / 10, 0);
                }
                if (idx == 2) {
                    delta = new Vector3(-unitSize / 10, 0, 0);
                }
                if (idx == 3) {
                    delta = new Vector3(0, -unitSize / 10, 0);
                }
                const colorObj = new Color(color);
                if (delta) {
                    const deltaColor = new Color(colorObj.r / 32, colorObj.g / 32, colorObj.b / 32);
                    for (let i = 0; i < 10; i++) {
                        tmp.push(point.clone().add(delta.clone().multiplyScalar(i)));
                        tmp.push(point.clone().add(delta.clone().multiplyScalar(i + 1)));
                        colors.push(colorObj.clone().add(deltaColor.clone().multiplyScalar(-1 * idx * 10 - i)));
                        colors.push(colorObj.clone().add(deltaColor.clone().multiplyScalar(-1 * idx * 10 - i - 1)));
                    }
                }
                return tmp;
            }).flat().map(v => [v.x, v.y, v.z]).flat();
            const colorsArr = colors.map(c => [c.r, c.g, c.b]).flat();
            const geometry = new BufferGeometry();
            geometry.setAttribute('position', new Float32BufferAttribute(tmpPoints, 3));
            geometry.setAttribute('color', new Float32BufferAttribute(colorsArr, 3));
            geometry.setAttribute('color', new Float32BufferAttribute(colorsArr, 3));
            let material = new LineBasicMaterial({vertexColors: VertexColors, linewidth: 100.0});
            return new LineSegments(geometry, material);
        } else {
            const material = new LineBasicMaterial({
                color: color,
                linewidth: 1
            });
            const geometry = new BufferGeometry().setFromPoints(points);
            return new Line(geometry, material);
        }
    }

    destructor() {
        this.stage.scene.remove(this.plane);
        if (this.line) {
            this.stage.scene.remove(this.line);
        }
        this.game.board = this.game.board.filter(x => x !== this);
    }

    draw(x, y) {
        this.stage.scene.add(this.plane);
        this.setPos(x, y);
        if (this.line)
            this.stage.scene.add(this.line);
    };

    makePassive() {
        this.stage.scene.remove(this.line);
        this.line = this.renderLine(0x666666);
        this.stage.scene.add(this.line);
        this.setPos(this.x, this.y);
    }

    setPos(x, y) {
        this.plane.position.x = x * this.game.unitSize + this.game.unitSize / 2;
        this.plane.position.y = y * this.game.unitSize + this.game.unitSize / 2;
        if (this.line) {
            this.line.position.x = this.plane.position.x;
            this.line.position.y = this.plane.position.y;
        }
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

    constructor(game, stage, rank, suit) {
        super(game, stage, assetCache["img" + rank + suit], null, null, null, 0x00ff00, true);
        this.rank = rank;
        this.suit = suit;
    }

    static generate(game, stage) {
        const suit = Poker.SUITS[random(Poker.SUITS.length)];
        const rank = Poker.RANKS[random(Poker.RANKS.length)];
        return new TBCard(game, stage, rank, suit);
    }
}

class TBWall extends Drawable {
    plane;
    x;
    y;

    constructor(game, stage) {
        super(game, stage, Asset.fromModule(require('../assets/png/wall.png')));
    }
}


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

    currentGame.frameNo = 1;
    currentGame.render = (millis) => {
        currentGame["timeout"] = requestAnimationFrame(currentGame.render);
        updateFrame();
        if (currentGame.stagePlay && currentGame.stagePlay.renderer && currentGame.stagePlay.scene) {
            currentGame.stagePlay.renderer.render(currentGame.stagePlay.scene, currentGame.stagePlay.camera);
            currentGame.stagePlay.renderer.getContext().endFrameEXP();
        }
        if (currentGame.stageInfo && currentGame.stageInfo.renderer && currentGame.stageInfo.scene) {
            currentGame.stageInfo.renderer.render(currentGame.stageInfo.scene, currentGame.stageInfo.camera);
            currentGame.stagePlay.renderer.getContext().endFrameEXP();
        }
    };


    function prepareScene(gl, sceneColor) {
        const {drawingBufferWidth: width, drawingBufferHeight: height} = gl;
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
        const ambientLight = new AmbientLight(0xFFFFFF);
        scene.add(ambientLight);
        return {scene, camera, renderer};
    }

    function onContextCreateNext(gl) {
        currentGame.stageInfo = prepareScene(gl, 0xCCCCCC);
    }

    function onContextCreate(gl) {
        currentGame.stagePlay = prepareScene(gl, 0x0000ff);
        _loadAssets().then(() => {
            currentGame.speed = 1000;
            const game = new TBGame(currentGame.stagePlay, currentGame.stageInfo);
            game.currentBrick = TBBrick.generate(game, currentGame.stagePlay);
            game.currentBrick.draw();
            game.nextBrick = TBBrick.generate(game, currentGame.stagePlay);
            currentGame.game = game;
            game.setMsg("Game Speed: " + currentGame.speed, 0x996633);
            step();
        });

        currentGame.render();
    }

    useEffect(() => {
        let soundHandler;
        window !== undefined && window.addEventListener("keydown", onKeyDown);
        new Audio.Sound.createAsync(
            require('../assets/Tetris.mp3'), {shouldPlay: true, isLooping: true}
        ).then(({sound}) => {
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

    function updateFrame() {
        !(currentGame.frameNo++ % 20) && currentGame.game && currentGame.game.board.forEach(d => {
            if (d.line) d.line.rotation.z += -Math.PI / 2;
        });
    }

    function step() {
        const game = currentGame.game;
        if (!game.currentBrick.move(0, -1) && !currentGame.game.isOver) {
            game.currentBrick.makePassive();
            checkLine();
            game.currentBrick = game.nextBrick;
            if (!game.currentBrick.draw()) {
                game.currentBrick.makePassive();
                gameOver();
            }
            game.nextBrick = TBBrick.generate(game, currentGame.stagePlay);
        }
        currentGame.interval = setTimeout(step, currentGame.speed);
    }

    function gameOver() {
        currentGame.game.isOver = true;
        currentGame.game.setMsg("GAME OVER", 0xff0000);
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

            const pokerCards = [];
            linesToRemove.forEach(l => {
                currentGame.game.board.forEach(d => {
                    if ((d instanceof TBCard) && d.y === l)
                        pokerCards.push(d);
                });
            });
            const {score, rank, cards} = Poker.evaluate(pokerCards);
            currentGame.score = (currentGame.score ? currentGame.score : 0) + score;

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

            currentGame.speed -= linesToRemove.length * 10;
            currentGame.game.setMsg("Game Speed: " + currentGame.speed + "\nScore: " + currentGame.score + "\nRank: " + rank, 0x996633);
        }
    }

    function onDropClick(event) {
        while (currentGame.game.currentBrick.move(0, -1)) ;
    }

    function onLeftClick(event) {
        currentGame.game.currentBrick.move(-1, 0);
    }

    function onRightClick(event) {
        currentGame.game.currentBrick.move(1, 0);
    }

    function onDownClick(event) {
        currentGame.game.currentBrick.move(0, -1);
    }

    function onRotateClick(event) {
        currentGame.game.currentBrick.rotate();
    }

    function onKeyDown(event) {
        if ("ArrowLeft" === event.key) {
            onLeftClick(event);
        }
        if ("ArrowRight" === event.key) {
            onRightClick(event);
        }
        if ("ArrowDown" === event.key) {
            onDownClick(event);
        }
        if ("ArrowUp" === event.key) {
            onRotateClick(event);
        }
        if ("Enter" === event.key || " " === event.key) {
            onDropClick(event);
        }
    }

    return (

        <View style={{flex: 1}} onKeyPress={onKeyDown}>
            <View style={{flex: 1}}></View>
            <View style={{height: 440}}>
                <GLView style={{height: 440, width: 240}}
                        onContextCreate={onContextCreate}
                />
            </View>
            <View style={{height: 100}}>
                <View style={{width: 240}}>
                    <GLView style={{height: 100, width: 240}}
                            onContextCreate={onContextCreateNext}
                    />
                </View>
            </View>
            <View style={{height: 120, marginTop: 10}}>
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
