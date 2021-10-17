import React, {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Pressable,
    Text,
    View,
    Image,
    Platform,
    ActivityIndicatorComponent
} from 'react-native';
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
    score;
    frameNo;
    speed;
    height;
    width;
    unitSize;
    currentBrick;
    nextBrick;
    isOver;
    stageInfo;
    stagePlay;
    msgMeshs;
    selectedCards;

    constructor(stagePlay, stageInfo) {

        const DIVISIONS = 22;
        this.speed = 1000;
        this.score = 0;
        this.frameNo = 0;
        this.stagePlay = stagePlay;
        this.stageInfo = stageInfo;
        const tmpHeight = this.stagePlay.renderer.getContext().drawingBufferHeight;
        const tmpWidth = this.stagePlay.renderer.getContext().drawingBufferWidth;
        this.unitSize = tmpHeight / DIVISIONS;
        this.height = Math.floor(tmpHeight / this.unitSize)
        this.width = Math.floor(tmpWidth / this.unitSize)
        this.board = [];
        this.msgMeshs = [];
        this.selectedCards = [];
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

        for (let i = 0; i < 5; i++) {
            const infoHeight = this.stageInfo.renderer.getContext().drawingBufferHeight;
            const infoWidth = this.stageInfo.renderer.getContext().drawingBufferWidth;
            const tmp = new Drawable(this, this.stageInfo, null, 0xEEEEEE, 1, true, 0x000001, false, 2);
            tmp.plane.position.x = -infoWidth / 2 + this.unitSize + 10 + i * (this.unitSize * 2 + 5);
            tmp.plane.position.y = infoHeight / 2 - this.unitSize - 5
            this.stageInfo.scene.add(tmp.plane);
        }
        console.log("Game started ", this.height, this.width, this.unitSize);
    }

    setMsg(msgId, msg, color) {
        let msgMesh = this.msgMeshs[msgId];
        msgMesh && this.stageInfo.scene.remove(msgMesh)
        const infoHeight = this.stageInfo.renderer.getContext().drawingBufferHeight;
        const infoWidth = this.stageInfo.renderer.getContext().drawingBufferWidth;
        const size = (Platform.OS === 'web') ? 10 : 30;
        const geometry = new TextGeometry(msg, {
            font: ExpoFonts.helvetiker_bold,
            size,
        });
        msgMesh = new Mesh(geometry, new MeshBasicMaterial({color}));
        msgMesh.position.y = -infoHeight / 2 + (size * 2 * msgId);
        msgMesh.position.x = -infoWidth / 2 + 5;
        this.stageInfo.scene.add(msgMesh);
        this.msgMeshs[msgId] = msgMesh;
    }
}

class TBBrick {
    game;
    stage;
    matrix = [];

    static generate(game, stage) {
        const template = rotate90(TBBRICKS_TEMPLATES[random(TBBRICKS_TEMPLATES.length-6)]);
        const ret = new TBBrick();
        ret.game = game;
        ret.stage = stage;
        ret.matrix = new Array(template.length).fill(null).map(() => new Array(template.length).fill(null));
        const tmpCard = TBCard.generate(game, stage);
        template.forEach(
            (x, xIdx) => x.forEach(
                (y, yIdx) => {
                    y ? ret.matrix[xIdx][yIdx] = tmpCard.clone() : null;
                }
            )
        );
        tmpCard.destructor();
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
    x;
    y;
    plane;
    line;
    game;
    stage;

    constructor(game, stage, asset, color, opacity, ignoreGameBoard, lineColor, lineAnimated, scale) {
        this.game = game;
        this.stage = stage;
        scale = scale || 1;
        let unitMaterial;
        if (asset) {
            const texture = new TextureLoader().load(asset);
            unitMaterial = new MeshBasicMaterial({map: texture});
        } else {
            unitMaterial = new MeshBasicMaterial({color: color, opacity: opacity});
        }
        this.plane = new Mesh(new PlaneGeometry(this.game.unitSize * scale, this.game.unitSize * scale), unitMaterial);
        if (!ignoreGameBoard)
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

    constructor(game, stage, rank, suit, ignoreGameBoard, scale) {
        super(game, stage, assetCache["img" + rank + suit], null, null, ignoreGameBoard, 0x00ff00, true, scale);
        this.rank = rank;
        this.suit = suit;
    }

    static generate(game, stage) {
        const suit = Poker.SUITS[random(Poker.SUITS.length)];
        const rank = Poker.RANKS[random(Poker.RANKS.length)];
        return new TBCard(game, stage, rank, suit);
    }

    clone() {
        return new TBCard(this.game, this.stage, this.rank, this.suit);
    }

    toString() {
        return this.rank + this.suit;
    }
}

class TBWall extends Drawable {
    plane;
    x;
    y;

    constructor(game, stage) {
        super(game, stage, assetCache.wall);
    }
}

const currentGame = {};

const assetCache = {
    'redButton': Asset.fromModule(require('../assets/png/redButton.png')),
    'grayButton': Asset.fromModule(require('../assets/png/grayButton.png')),
    'wall': Asset.fromModule(require('../assets/png/wall.png')),
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
    'imgTC': Asset.fromModule(require('../assets/png/TC.png')),
    'imgTD': Asset.fromModule(require('../assets/png/TD.png')),
    'imgTH': Asset.fromModule(require('../assets/png/TH.png')),
    'imgTS': Asset.fromModule(require('../assets/png/TS.png')),
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

    function prepareScene(gl, sceneColor) {
        const {drawingBufferWidth: width, drawingBufferHeight: height} = gl;
        const renderer = new Renderer({gl, antialias: true});
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

    function initGame() {
        const game = new TBGame(currentGame.stagePlay, currentGame.stageInfo);
        game.currentBrick = TBBrick.generate(game, currentGame.stagePlay);
        game.currentBrick.draw();
        game.nextBrick = TBBrick.generate(game, currentGame.stagePlay);
        currentGame.game = game;
        game.setMsg(1, "Score: " + currentGame.game.score, 0xFFEF81);
        step();
    }

    function updateFrame() {
        if (currentGame.game) {
            !(currentGame.game.frameNo++ % 20) && currentGame.game.board.forEach(d => {
                if (d.line) d.line.rotation.z += -Math.PI / 2;
            });
        }
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
            } else {
                game.nextBrick = TBBrick.generate(game, currentGame.stagePlay);
            }
        }
        currentGame.interval = setTimeout(step, currentGame.game.speed);
    }

    function gameOver() {
        currentGame.game.isOver = true;
        currentGame.game.setMsg(2, "GAME OVER", 0xff0000);
        console.log("Game over...");
    }

    function checkLine() {
        const tmpHist = {};
        const linesToRemove = [];
        let theGame = currentGame.game;
        theGame.board.forEach(d => {
            if (d instanceof TBCard) {
                tmpHist[d.y] = tmpHist[d.y] ? tmpHist[d.y] + 1 : 1;
                if (tmpHist[d.y] === theGame.width - 2) {
                    linesToRemove.push(d.y);
                }
            }
        });
        if (linesToRemove.length > 0) {

            const pokerCards = [];
            linesToRemove.forEach(l => {
                theGame.board.forEach(d => {
                    if ((d instanceof TBCard) && d.y === l)
                        pokerCards.push(d);
                });
                const selected = Poker.findHighest(pokerCards);
                if (!theGame.selectedCards.find(x => x.suit == selected.suit && x.rank == selected.rank)) {
                    const tmp = new TBCard(theGame, theGame.stageInfo, selected.rank, selected.suit, true, 2);
                    theGame.selectedCards[theGame.selectedCards.length] = tmp;
                    const infoHeight = theGame.stageInfo.renderer.getContext().drawingBufferHeight;
                    const infoWidth = theGame.stageInfo.renderer.getContext().drawingBufferWidth;
                    tmp.plane.position.x = -infoWidth / 2 + theGame.unitSize + 10 + (theGame.selectedCards.length - 1) * (theGame.unitSize * 2 + 5);
                    tmp.plane.position.y = infoHeight / 2 - theGame.unitSize - 5
                    theGame.stageInfo.scene.add(tmp.plane);
                }

                if (theGame.selectedCards.length == 5) {
                    const ret = Poker.evaluate(theGame.selectedCards);
                    theGame.score += (7462 - ret.score); // Max score 1 min score 7462
                    theGame.speed += ret.score / 100;
                    if (theGame.speed > 1000) theGame.speed = 1000;
                    theGame.setMsg(2, "Rank: " + ret.rank, 0x0022DD);
                    theGame.selectedCards.forEach(card => {
                        card.destructor();
                    });
                    theGame.selectedCards.length = 0;
                }
                pokerCards.length = 0;
            });

            linesToRemove.sort((a, b) => b - a);
            linesToRemove.forEach(l => {
                theGame.board.forEach(d => {
                    if ((d instanceof TBCard) && d.y === l)
                        d.destructor();
                });
                theGame.board.forEach(d => {
                    if (d.y > l && (d instanceof TBCard))
                        d.setPos(d.x, d.y - 1);
                });
            });

            if (theGame.board.filter(d => d instanceof TBCard).length == 4) {
                theGame.speed += (1000-theGame.speed)/2;
                if (theGame.speed > 1000) theGame.speed = 1000;
            }

        }
        theGame.speed -= 4;
        if (theGame.speed < 1)
            theGame.speed = 1;
        theGame.setMsg(1, "Score: " + theGame.score + " Speed:%" + Math.trunc((1000 - theGame.speed) / 10), 0xFFEF81);
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
            currentGame.interval && clearTimeout(currentGame.interval);
            for (var key in currentGame) {
                if (currentGame.hasOwnProperty(key)) {
                    delete currentGame[key];
                }
            }
            soundHandler.unloadAsync().catch(err => {
                console.log("Unload warning: " + err)
            });
        };
    }, []);

    const [assetsLoaded, setAssetsLoaded] = useState(false);
    _loadAssets().then(() => {
        setAssetsLoaded(true);
    });

    currentGame.render = (millis) => {
        if (currentGame.render)
            currentGame.timeout = requestAnimationFrame(currentGame.render);
        if (currentGame.stagePlay && currentGame.stageInfo && assetsLoaded) {
            if (!currentGame.game) {
                initGame();
            }
            updateFrame();
            currentGame.stagePlay.renderer.render(currentGame.stagePlay.scene, currentGame.stagePlay.camera);
            currentGame.stagePlay.renderer.getContext().endFrameEXP();
            currentGame.stageInfo.renderer.render(currentGame.stageInfo.scene, currentGame.stageInfo.camera);
            currentGame.stageInfo.renderer.getContext().endFrameEXP();
        }
    }

    currentGame.render();

    function onContextCreateInfo(gl) {
        currentGame.stageInfo = prepareScene(gl, 0x8080FF);
    }

    function onContextCreate(gl) {
        currentGame.stagePlay = prepareScene(gl, 0x0000ff);
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

    let gameView = (
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
                            onContextCreate={onContextCreateInfo}
                    />
                </View>
            </View>
            <View style={{height: 120, marginTop: 10}}>
                <View style={{flex: 1, flexDirection: 'row', height: 50}}>
                    <View style={{flex: 5, flexDirection: 'column'}}>
                        <View style={{flex: 1}}/>
                        <View style={{flex: 4}}>
                            <Pressable
                                style={({pressed}) => [
                                    styles.button,
                                    {opacity: pressed ? 0.5 : 1}
                                ]}
                                onPress={onDropClick}>
                                <Image style={styles.buttonImg}
                                       source={assetCache.redButton}/>
                            </Pressable>
                        </View>
                        <View style={{flex: 1}}/>
                    </View>
                    <View style={{flex: 1}}/>
                    <View style={{flex: 3, flexDirection: 'column'}}>
                        <View style={{flex: 1}}/>
                        <View style={{flex: 2}}>
                            <Pressable
                                style={({pressed}) => [
                                    styles.button,
                                    {opacity: pressed ? 0.5 : 1}
                                ]}
                                onPress={onLeftClick}>
                                <Image style={styles.buttonImg}
                                       source={assetCache.grayButton}/>
                            </Pressable>
                        </View>
                        <View style={{flex: 1}}/>
                    </View>
                    <View style={{flex: 3, flexDirection: 'column'}}>
                        <View style={{flex: 2}}>
                            <Pressable
                                style={({pressed}) => [
                                    styles.button,
                                    {opacity: pressed ? 0.5 : 1}
                                ]}
                                onPress={onRotateClick}>
                                <Image style={styles.buttonImg}
                                       source={assetCache.grayButton}/>
                            </Pressable>
                        </View>
                        <View style={{flex: 2}}>
                            <Pressable
                                style={({pressed}) => [
                                    styles.button,
                                    {opacity: pressed ? 0.5 : 1}
                                ]}
                                onPress={onDownClick}>
                                <Image style={styles.buttonImg}
                                       source={assetCache.grayButton}/>
                            </Pressable>
                        </View>
                    </View>
                    <View style={{flex: 3, flexDirection: 'column'}}>
                        <View style={{flex: 1}}/>
                        <View style={{flex: 2}}>
                            <Pressable
                                style={({pressed}) => [
                                    styles.button,
                                    {opacity: pressed ? 0.5 : 1}
                                ]}
                                onPress={onRightClick}>
                                <Image style={styles.buttonImg}
                                       source={assetCache.grayButton}/>
                            </Pressable>
                        </View>
                        <View style={{flex: 1}}/>
                    </View>
                </View>
            </View>
        </View>
    );

    if (assetsLoaded)
        return gameView;
    else
        return <ActivityIndicator/>
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
