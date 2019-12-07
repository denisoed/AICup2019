const UnitAction = require('./model/unit-action').UnitAction;
const Vec2Double = require('./model/vec2-double').Vec2Double;
const Item = require('./model/item').Item;
const Tile = require('./model/tile');
const CustomData = require('./model/custom-data').CustomData;

class MyStrategy {

    constructor() {
        this.healthBoxes = [];
        this.theSafeDistance = 10;
    };

    async getMap(game, unit, nearestEnemy) {
        let map = [];
        let data = await game.level.tiles;
        for (let i = 0; i < await data[0].length; i++) {
            let str = '';
            let tempIndex = 0;
            for (let j = 0; j < await data.length; j++) {
                if (nearestEnemy.position.x > unit.position.x) {
                    if (Math.round(unit.position.x) === j && Math.round(unit.position.y) === i) {
                        str += '♞ ';
                    } else if (Math.round(nearestEnemy.position.x) === j && Math.round(nearestEnemy.position.y) === i) {
                        str += '♜ ';
                    } else {
                        str += await data[tempIndex][i] + ' ';
                    }
                } else {
                    if (Math.round(unit.position.x - 1) === j && Math.round(unit.position.y - 1) === i) {
                        str += '♞ ';
                    } else if (Math.round(nearestEnemy.position.x - 1) === j && Math.round(nearestEnemy.position.y) === i) {
                        str += '♜ ';
                    } else {
                        str += await data[tempIndex][i] + ' ';
                    }
                }
                tempIndex += 1;
            }
            map.push(str);
        }
        return map.reverse();
    };

    // --------------- Health ---------------- //
    getHealthPacks(game) {
        const boxes = game.lootBoxes.filter(box => box.item instanceof Item.HealthPack);
        if (boxes.length !== 0) {
            this.healthBoxes = boxes;
        } else {
            this.healthBoxes = [];
        }
    };

    getNearestHealthPack(bot_pos, unit) {
        let arrayX = [];
        let arrayY = [];
        this.healthBoxes.forEach(box => {
            arrayX.push({ 'num': (Math.abs(box.position.x - bot_pos.x) + bot_pos.x), 'box': box });
            arrayY.push({ 'num': (Math.abs(box.position.y - bot_pos.y) + bot_pos.y), 'box': box });
        });
        let nearestByX = arrayX.sort((a, b) => (a.num > b.num) ? 1 : ((b.num > a.num) ? -1 : 0))[0];
        let nearestByY = arrayY.sort((a, b) => (a.num > b.num) ? 1 : ((b.num > a.num) ? -1 : 0))[0];
        if (Math.round(Math.abs(nearestByX.num + bot_pos.x)) === Math.round(Math.abs(nearestByY.num + bot_pos.y))) {
            if (bot_pos.x > unit.position.x) {
                if (bot_pos.x < nearestByX.box.position.x) {
                    return nearestByX;
                }
                return nearestByY
            }
            if (bot_pos.x > nearestByX.box.position.x) {
                return nearestByY;
            }
            return nearestByX
        }
        if (nearestByX.num + bot_pos.x > nearestByY.num + bot_pos.y) {
            return nearestByX;
        }
        return nearestByY;
    };

    // ------------- Distance ------------ //
    safeDistance(unit, nearestEnemy) {
        let x = 0;
        let y = 0;
        if (unit.position.x > nearestEnemy.position.x) {
            x = nearestEnemy.position.x + this.theSafeDistance;
        } else {
            x = nearestEnemy.position.x - this.theSafeDistance;
        }
        if (unit.position.y < nearestEnemy.position.y) {
            y = nearestEnemy.position.y + this.theSafeDistance;
        } else {
            y = nearestEnemy.position.y - this.theSafeDistance;
        }
        return new Vec2Double(x, y);
    };

    // ------------ Barriers ------------- //
    async detectWall(game, unit, targetPos, nearestEnemy) {        
        console.log(await this.getMap(game, unit, nearestEnemy));

        if (nearestEnemy.position.x < unit.position.x) {
            if (targetPos.x > unit.position.x && await game.level.tiles[parseInt(unit.position.x + 1)][parseInt(unit.position.y)] === Tile.Wall) {
                // Wall behind
            }
            if (targetPos.x < unit.position.x && await game.level.tiles[parseInt(unit.position.x - 1)][parseInt(unit.position.y)] === Tile.Wall) {
                // Wall front
            }
        } else {
            if (targetPos.x > unit.position.x && await game.level.tiles[parseInt(unit.position.x + 1)][parseInt(unit.position.y)] === Tile.Wall) {
                // Wall front
            }
            if (targetPos.x < unit.position.x && await game.level.tiles[parseInt(unit.position.x - 1)][parseInt(unit.position.y)] === Tile.Wall) {
                // Wall behind
            }
        }
    };

    // ------------ Shoot -------------- //
    // toShoot() {

    // };

    moveBot(unit, nearestWeapon, nearestEnemy) {
        if (unit.health < 55 && this.healthBoxes.length !== 0) {
            const nearestHealthBox = this.getNearestHealthPack(unit.position, nearestEnemy);
            return nearestHealthBox.box.position;
        } else {
            if (unit.weapon === null && nearestWeapon) {
                return nearestWeapon.position;
            }
            return this.safeDistance(unit, nearestEnemy);
        }
    };

    async getAction (unit, game, debug) {
        const distanceSqr = function (a, b) {
            return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
        };

        
        let minDistance = Number.POSITIVE_INFINITY;
        this.getHealthPacks(game);
        const nearestEnemy = game.units
            .filter((u) => {
                return u.playerId !== unit.playerId;
            })
            .reduce(function (prev, u) {
                let currentDistance = distanceSqr(u, unit);
                if (currentDistance < minDistance) {
                    minDistance = currentDistance;
                    return u;
                }
                return prev;
            });
        
        minDistance = Number.POSITIVE_INFINITY;
        const nearestWeapon = game.lootBoxes
            .filter ((box) => {
                return box.item instanceof Item.Weapon;
            })
            .reduce(function (prev, box) {
                let currentDistance = distanceSqr(box, unit);
                if (currentDistance < minDistance) {
                    minDistance = currentDistance;
                    return box;
                }
                return prev;
            });
        
        let targetPos = this.moveBot(unit, nearestWeapon, nearestEnemy);
        await debug.draw(new CustomData.Log(`Target pos: X: ${targetPos.x.toString()}, Y: ${targetPos.y.toString()}`));
        
        let aim = new Vec2Double(0, 0);
        if (nearestEnemy) {
            aim = new Vec2Double(
                nearestEnemy.position.x - unit.position.x,
                nearestEnemy.position.y - unit.position.y
            );
        }

        let jump = targetPos.y > unit.position.y;
        if (targetPos.x > unit.position.x && await game.level.tiles[parseInt(unit.position.x + 1)][parseInt(unit.position.y)] === Tile.Wall) {
            jump = true;
        }
            
        if (targetPos.x < unit.position.x && await game.level.tiles[parseInt(unit.position.x - 1)][parseInt(unit.position.y)] === Tile.Wall) {
            jump = true;
        }

        this.detectWall(game, unit, targetPos, nearestEnemy);

        return new UnitAction(
            (targetPos.x - unit.position.x) * 3,
            jump,
            !jump,
            aim,
            true,
            false,
            false,
            false
        );
    }
}

module.exports.MyStrategy = MyStrategy;
