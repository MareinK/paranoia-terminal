const seedrandom = require('seedrandom');

var exist_chance = 2 / 3;
function tileExists(x, y) {
    Math.seedrandom(x + '_' + y + '_exist_' + 14);
    var r = Math.random() <= exist_chance;
    Math.seedrandom();
    return r;
}

var range = 15;

var sx = 2;
var sy = 10;

for (var y = range; y >= -range; y--) {
    for (var x = -range; x <= range; x++) {
        if (x === 0 && y === 0)
            process.stdout.write('X')
        else if (x === sx && y === sy)
            process.stdout.write('.')
        else
            process.stdout.write(tileExists(x, y) ? ' ' : 'O');

    }
    process.stdout.write('\n');
}
