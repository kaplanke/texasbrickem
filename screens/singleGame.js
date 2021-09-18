import React, {useState, useEffect} from 'react';
import {StyleSheet, TouchableOpacity, Text, View} from 'react-native';
import {GLView} from 'expo-gl';
import {Asset} from 'expo-asset';
import {Renderer, TextureLoader} from 'expo-three';
import {rotate90, rotate270} from '2d-array-rotation';
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
    }
    ;

}

class Drawable {
    plane;
    x;
    y;
    game;

    constructor(game, asset) {
        this.game = game;
        const texture = new TextureLoader().load(asset);
        const unitMaterial = new MeshBasicMaterial({map: texture});
        this.plane = new Mesh(new PlaneGeometry(this.game.unitSize, this.game.unitSize), unitMaterial);
        game.board.push(this);
    }

    destructor() {
        this.game.scene.remove(this.plane);
        this.game.board = this.game.board.filter(x => x !== this);
    }

    draw(x, y) {
        throw new Error("Not Implemented");
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
        super(game, Asset.fromModule(require('../assets/cards/' + rank + suit + '.svg')));
        this.rank = rank;
        this.suit = suit;
    }

    static generate(game) {
        const suit = TB_SUITS.suits[random(TB_SUITS.suits.length)];
        const rank = TB_RANKS.ranks[random(TB_RANKS.ranks.length)];
        const ret = new TBCard(game, rank, suit);
        return ret;
    }

    draw(x, y) {
        this.game.scene.add(this.plane);
        this.setPos(x, y);
    }

};

class TBWall extends Drawable {
    plane;
    x;
    y;

    constructor(game) {
        super(game, Asset.fromModule(require('../assets/wall.svg')));
    }

    draw(x, y) {
        this.game.scene.add(this.plane);
        this.setPos(x, y);
    }

};


const currentGame = {};

export default function SingleGame() {

    function onContextCreate(gl) {

        const {drawingBufferWidth: width, drawingBufferHeight: height} = gl;
        const sceneColor = 0xdddddd;

        // Create a WebGLRenderer without a DOM element
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

        const render = (millis) => {
            currentGame["timeout"] = requestAnimationFrame(render);
            //update();
            renderer.render(scene, camera);
            gl.endFrameEXP();
        };
        render();
    }

    useEffect(() => {
        if (window) {
            window.addEventListener("keydown", onKeyDown);
            return () => {
                window.removeEventListener("keydown", onKeyDown);
                cancelAnimationFrame(currentGame.timeout);
                clearInterval(currentGame.interval);
            };
        }
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
                if (tmpHist[d.y] === currentGame.game.width-2) {
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
        while(currentGame.game.currentBrick.move(0,-1));
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
            <View style={{flex: 11, flexDirection: 'row'}}>
                <GLView style={{height: 500, width: 250}}
                        onContextCreate={onContextCreate}
                />
            </View>
            <View style={{flex: 3, flexDirection: 'row'}}>
                <TouchableOpacity style={styles.button} onPress={onLeftClick}>
                    <Text style={styles.buttonText}></Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={onRightClick}>
                    <Text style={styles.buttonText}></Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={onRotateClick}>
                    <Text style={styles.buttonText}></Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={onDownClick}>
                    <Text style={styles.buttonText}></Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={onDropClick}>
                    <Text style={styles.buttonText}></Text>
                </TouchableOpacity>
            </View>
        </View>
    );

}

const styles = StyleSheet.create({
    button: {
        width: 100,
        height: 100,
        alignItems: 'center',
        padding: 20,
        borderRadius: 50,
        backgroundColor: '#3498db'
    },
    buttonText: {
        fontSize: 25,
        color: '#fff'
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
