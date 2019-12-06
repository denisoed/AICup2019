const UnitAction = require('./model/unit-action').UnitAction;
const Vec2Double = require('./model/vec2-double').Vec2Double;
const Item = require('./model/item').Item;
const Tile = require('./model/tile');
const CustomData = require('./model/custom-data').CustomData;

class MyStrategy {

    constructor() {
        this.healthBoxes = [];
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

    getNearestHealthPack(user_pos, unit) {
        let arrayX = [];
        let arrayY = [];
        this.healthBoxes.forEach(box => {
            arrayX.push({ 'num': (Math.abs(box.position.x - user_pos.x) + user_pos.x), 'box': box });
            arrayY.push({ 'num': (Math.abs(box.position.y - user_pos.y) + user_pos.y), 'box': box });
        });
        let nearestByX = arrayX.sort((a, b) => (a.num > b.num) ? 1 : ((b.num > a.num) ? -1 : 0))[0];
        let nearestByY = arrayY.sort((a, b) => (a.num > b.num) ? 1 : ((b.num > a.num) ? -1 : 0))[0];
        if (Math.abs(nearestByX.num + user_pos.x) === Math.abs(nearestByY.num + user_pos.y)) {
            if (user_pos.x > unit.position.x) {
                if (user_pos.x < nearestByX.box.position.x) {
                    return nearestByX;
                }
                return nearestByY
            }
            if (user_pos.x > nearestByX.box.position.x) {
                return nearestByY;
            }
            return nearestByX
        }
        if (nearestByX.num + user_pos.x > nearestByY.num + user_pos.y) {
            return nearestByX;
        }
        return nearestByY;
    };

    // ------------- Distance ------------ //
    safeDistance(unit, nearestEnemy) {
        let x = 0;
        let y = 0;
        if (unit.position.x > nearestEnemy.position.x) {
            x = nearestEnemy.position.x + 5;
        } else {
            x = nearestEnemy.position.x - 5;
        }
        if (unit.position.y < nearestEnemy.position.y) {
            y = nearestEnemy.position.y + 5;
        } else {
            y = nearestEnemy.position.y - 5;
        }
        return new Vec2Double(x, y);
    };

    // ------------ Barriers ------------- //
    async detectWall(game, unit, targetPos) {
        // if (targetPos.x > unit.position.x && await game.level.tiles[parseInt(unit.position.x + 2)][parseInt(unit.position.y)] === Tile.Wall) {
        //     console.log('Wall');
        // }

        // if (targetPos.x < unit.position.x && await game.level.tiles[parseInt(unit.position.x - 2)][parseInt(unit.position.y)] === Tile.Wall) {
        //     console.log('Wall');
        // }
    };

    // ------------ Shoot -------------- //
    // toShoot() {

    // };

    moveBot(unit, nearestWeapon, nearestEnemy) {
        if (unit.health < 55 && this.healthBoxes.length !== 0) {
            const nearestHealthBox = this.getNearestHealthPack(unit.position);
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

        // this.detectWall(game, unit, targetPos);

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
