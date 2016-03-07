'use strict';

// define display
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var display = rlt.Display({
	canvas: canvas,
	width: 32,
	height: 32,
	tileWidth: 8,
	tileHeight: 8
});
canvas.width = display.width * display.tileWidth;
canvas.height = display.height * display.tileHeight;

var schedule = rlt.Schedule();

var tiles = {
	empty: {
		char: ' ',
		color: 'transparent',
		passable: false,
		transparent: false
	},
	floor: {
		char: '.',
		color: '#FFF',
		passable: true,
		transparent: true
	},
	vertical: {
		char: '│',
		color: '#FFF',
		passable: false,
		transparent: false
	},
	horizontal: {
		char: '─',
		color: '#FFF',
		passable: false,
		transparent: false
	},
	topRight: {
		char: '┐',
		color: '#FFF',
		passable: false,
		transparent: false
	},
	topLeft: {
		char: '┌',
		color: '#FFF',
		passable: false,
		transparent: false
	},
	bottomRight: {
		char: '┘',
		color: '#FFF',
		passable: false,
		transparent: false
	},
	bottomLeft: {
		char: '└',
		color: '#FFF',
		passable: false,
		transparent: false
	},
	door: {
		char: '+',
		color: '#DDD',
		passable: true,
		transparent: false
	},
	openDoor: {
		char: '/',
		color: '#DDD',
		passable: true,
		transparent: true
	},
	corridor: {
		char: '#',
		color: '#888',
		passable: true,
		transparent: true
	}
};

var newTile = function(tile) {
	return Object.create(tiles[tile]);
}

var move = function(dx, dy) {
	if (level[this.x+dx][this.y+dy].passable) {
		level[this.x][this.y].actor = undefined;
		if (level[this.x][this.y].char === '+' ||
			level[this.x][this.y].char === '/') {
			this.exitDoor(dx, dy);
		}
		this.x += dx;
		this.y += dy;
		level[this.x][this.y].actor = this;
		if (level[this.x][this.y].char === '+') {
			this.enterDoor();
		}
		schedule.add(this, this.delay);
		schedule.advance().act();
	}
};

var exitDoor = function(dx, dy) {
	var room = level[this.x][this.y].room;
	if (level[this.x+dx][this.y+dy].char === '#') {
		level[this.x][this.y] = newTile('openDoor');
	} else {
		level[this.x][this.y] = newTile('door');
	}
	level[this.x][this.y].room = room;
};

var enterCorridor = function() {
	// destroy all other rooms
	var thisRoom = level[this.x][this.y].room;
	for (x = 0; x < display.width; x++) for (var y = 0; y < display.height; y++) {
		if (level[x][y].room !== thisRoom) {
			level[x][y] = newTile('empty');
		}
	}
	// find facing
	var facing;
	if (level[this.x-1][this.y].char === '+') {
		facing = {
			xx: 0,
			xy: -1,
			yy: 0,
			yx: 1
		};
	} else if (level[this.x+1][this.y].char === '+') {
		facing = 'right';
	} else if (level[this.x][this.y-1].char === '+') {
		facing = {
			xx: 1,
			xy: 0,
			yy: 1,
			yx: 0
		};
	} else {
		facing = 'up';
	}
	var width = rlt.random(6, 9);
	var height = rlt.random(6, 9);
	var xpos = rlt.random(0, display.width-width);
	var ypos = rlt.random(this.y+2, display.height-height);
	makeRoom(xpos, ypos, width, height);
	var doors = addDoors(xpos, ypos, width, height, {top:1});
	makeCorridor(this, doors.top, 'vertical');
};

var player = {
	char: '@',
	color: '#FFF',
	delay: 100,
	move: move,
	enterDoor: enterCorridor,
	exitDoor: exitDoor
};
player.act = function() {
	for (var x = 0; x < display.width; x++) for (var y = 0; y < display.height; y++) {
		level[x][y].visible = false;
	}
	rlt.shadowcast(player.x, player.y, function(x, y) {
		return level[x][y].transparent;
	}, function(x, y) {
		level[x][y].visible = true;
	});
	draw();
};

// maps from character to sprite location
var char2spriteX = {
	' ': 0,
	'.': 1,
	'@': 6,
	'#': 3,
	'┌': 9,
	'└': 9,
	'┐': 11,
	'┘': 11,
	'─': 10,
	'│': 10,
	'+': 12,
	'/': 0
};
var char2spriteY = {
	' ': 4,
	'.': 4,
	'@': 4,
	'#': 4,
	'┌': 4,
	'└': 5,
	'┐': 4,
	'┘': 5,
	'─': 4,
	'│': 5,
	'+': 4,
	'/': 5
};

// return a canvas graphical reprentation of a tile
var cacheTile = function(tileset, tile) {
	tile.canvas = document.createElement('canvas');
	tile.canvas.width = display.tileWidth;
	tile.canvas.height = display.tileHeight;
	var ctx = tile.canvas.getContext('2d');
	ctx.drawImage(tileset, display.tileWidth * char2spriteX[tile.char], display.tileHeight * char2spriteY[tile.char], display.tileWidth, display.tileHeight, 0, 0, display.tileWidth, display.tileHeight);
	ctx.globalCompositeOperation = 'source-in';
	ctx.fillStyle = tile.color;
	ctx.fillRect(0, 0, display.tileWidth, display.tileHeight);
	return tile;
}

// define level
var level = [];
for (var x = 0; x < display.width; x++) {
	level[x] = [];
}

var draw = function() {
	display.ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var x = 0; x < display.width; x++) {
		for (var y = 0; y < display.height; y++) {
			var tile = level[x][y];
			if (true || tile.visible) {
				if (tile.actor) {
					display.drawCached(tile.actor.canvas, x, y);
				} else {
					display.drawCached(tile.canvas, x, y);
				}
			}
		}
 	}
};

var makeRoom = function(x, y, w, h) {
	var room = {
		x: x,
		y: y,
		w: w,
		h: h
	};
	for (var dx = 1; dx < w-1; dx++) {
		level[x+dx][y] = newTile('horizontal');
		level[x+dx][y+h-1] = newTile('horizontal');
		for (var dy = 1; dy < h-1; dy++) {
			level[x+dx][y+dy] = newTile('floor');
		}
	}
	for (var dy = 1; dy < h-1; dy++) {
		level[x][y+dy] = newTile('vertical');
		level[x+w-1][y+dy] = newTile('vertical');
	}
	level[x    ][y    ] = newTile('topLeft');
	level[x+w-1][y    ] = newTile('topRight');
	level[x    ][y+h-1] = newTile('bottomLeft');
	level[x+w-1][y+h-1] = newTile('bottomRight');
	for (var dx = 0; dx < w; dx++) for (var dy = 0; dy < h; dy++) {
		level[x+dx][y+dy].room = room;
	}
	return room;
};

var makeCorridor = function(a, b, type) {
	if (type === 'vertical') {
		var temp = a;
		a = a.y < b.y ? a : b;
		b = temp.y >= b.y ? temp : b;
		var ymid = rlt.random(a.y+1, b.y-1);
		for (var y = a.y+1; y < ymid; y++) {
			level[a.x][y] = newTile('corridor');
		}
		for (var y = ymid+1; y < b.y; y++) {
			level[b.x][y] = newTile('corridor');
		}
		var xmin = Math.min(a.x, b.x);
		var xmax = Math.max(a.x, b.x);
		for (var x = xmin; x <= xmax; x++) {
			level[x][ymid] = newTile('corridor');
		}
	} else {
		var temp = a;
		a = a.x < b.x ? a : b;
		b = temp.x >= b.x ? temp : b;
		var xmid = rlt.random(a.x+1, b.x-1);
		for (var x = a.x+1; x < xmid; x++) {
			level[x][a.y] = newTile('corridor');
		}
		for (var x = xmid+1; x < b.x; x++) {
			level[x][b.y] = newTile('corridor');
		}
		var ymin = Math.min(a.y, b.y);
		var ymax = Math.max(a.y, b.y);
		for (var y = ymin; y <= ymax; y++) {
			level[xmid][y] = newTile('corridor');
		}
	}
};

var addDoors = function(x, y, w, h, chance) {
	var room = level[x][y].room;
	var doorTop = false;
	var doorRight = false;
	var doorBottom = false;
	var doorLeft = false;
	chance = chance || {};
	chance.top = chance.top || 0;
	chance.right = chance.right || 0;
	chance.bottom = chance.bottom || 0;
	chance.left = chance.left || 0;
	for (var dx = 1; dx < w-1; dx++) {
		if (!doorTop && Math.random() < chance.top * dx / (w-2)) {
			level[x+dx][y] = newTile('door');
			level[x+dx][y].room = room;
			doorTop = {x: x+dx, y: y};
		}
		if (!doorBottom && Math.random() < chance.bottom * dx / (w-2)) {
			level[x+dx][y+h-1] = newTile('door');
			level[x+dx][y+h-1].room = room;
			doorBottom = {x: x+dx, y: y+h-1};
		}
	}
	for (var dy = 1; dy < h-1; dy++) {
		if (!doorLeft && Math.random() < chance.left * dy / (h-2)) {
			level[x][y+dy] = newTile('door');
			level[x][y+dy].room = room;
			doorLeft = {x: x, y: y+dy};
		}
		if (!doorRight && Math.random() < chance.right * dy / (h-2)) {
			level[x+w-1][y+dy] = newTile('door');
			level[x+w-1][y+dy].room = room;
			doorRight = {x: x+w-1, y: y+dy};
		}
	}
	return {
		top: doorTop,
		bottom: doorBottom,
		left: doorLeft,
		right: doorRight
	};
}

// load and cache spritesheet and start game
rlt.loadImg('tileset.png', function() {
	cacheTile = cacheTile.bind(window, this);
	for (var tile in tiles) {
		tiles[tile] = cacheTile(tiles[tile]);
	}
	for (var x = 0; x < display.width; x++) for (var y = 0; y < display.height; y++) {
		level[x][y] = newTile('empty');
	}

	makeRoom(12, 12, 8, 8);
	addDoors(12, 12, 8, 8, {
		top: 1,
		right: 1,
		bottom: 1,
		left: 1
	});

	player.x = rlt.random(13, 18);
	player.y = rlt.random(13, 18);
	player = cacheTile(player);
	level[player.x][player.y].actor = player;

	schedule.add(player, 0);
	schedule.advance().act();
}, 104, 104);

// player input
var keyCodes = {
    '27': 'Escape',
    '32': ' ',
    '37': 'ArrowLeft',
    '38': 'ArrowUp',
    '39': 'ArrowRight',
    '40': 'ArrowDown',
    '65': 'a',
    '66': 'b',
    '67': 'c',
    '68': 'd',
    '69': 'e',
    '70': 'f',
    '71': 'g',
    '72': 'h',
    '73': 'i',
    '74': 'j',
    '75': 'k',
    '76': 'l',
    '77': 'm',
    '78': 'n',
    '79': 'o',
    '80': 'p',
    '81': 'q',
    '82': 'r',
    '83': 's',
    '84': 't',
    '85': 'u',
    '86': 'v',
    '87': 'w',
    '88': 'x',
    '89': 'y',
    '90': 'z',
    '96': '0',
    '97': '1',
    '98': '2',
    '99': '3',
    '100': '4',
    '101': '5',
    '102': '6',
    '103': '7',
    '104': '8',
    '105': '9',
    '190': '.',
    '191': '/'
};
var inputState = {
	pressed: '',
	movedDiagonally: false
};
var directionPressed = function(mode, key, callback) {
    'use strict';
    if (key === '1') {
        callback.call(player, -1, 1);
    }
    else if (key === '2') {
        callback.call(player, 0, 1);
    }
    else if (key === '3') {
        callback.call(player, 1, 1);
    }
    else if (key === '4') {
        callback.call(player, -1, 0);
    }
    else if (key === '5') {
        callback.call(player, 0, 0);
    }
    else if (key === '6') {
        callback.call(player, 1, 0);
    }
    else if (key === '7') {
        callback.call(player, -1, -1);
    }
    else if (key === '8') {
        callback.call(player, 0, -1);
    }
    else if (key === '9') {
        callback.call(player, 1, -1);
    }

    else if (key === 'Up' || key === 'ArrowUp') {
        if (mode.pressed === '') {
                mode.pressed = 'up';
        } else if (mode.pressed === 'left') {
                mode.movedDiagonally = true;
                callback.call(player, -1, -1);
        } else if (mode.pressed === 'right') {
                mode.movedDiagonally = true;
                callback.call(player, 1, -1);
        } else if (mode.pressed === 'down') {
                mode.movedDiagonally = true;
        }
    }
    else if (key === 'Left' || key === 'ArrowLeft') {
        if (mode.pressed === '') {
                mode.pressed = 'left';
        } else if (mode.pressed === 'up') {
                mode.movedDiagonally = true;
                callback.call(player, -1, -1);
        } else if (mode.pressed === 'down') {
                mode.movedDiagonally = true;
                callback.call(player, -1, 1);
        } else if (mode.pressed === 'right') {
                mode.movedDiagonally = true;
        }
    }
    else if (key === 'Down' || key === 'ArrowDown') {
        if (mode.pressed === '') {
                mode.pressed = 'down';
        } else if (mode.pressed === 'left') {
                mode.movedDiagonally = true;
                callback.call(player, -1, 1);
        } else if (mode.pressed === 'right') {
                mode.movedDiagonally = true;
                callback.call(player, 1, 1);
        } else if (mode.pressed === 'up') {
                mode.movedDiagonally = true;
        }
    }
    else if (key === 'Right' || key === 'ArrowRight') {
        if (mode.pressed === '') {
                mode.pressed = 'right';
        } else if (mode.pressed === 'up') {
                mode.movedDiagonally = true;
                callback.call(player, 1, -1);
        } else if (mode.pressed === 'down') {
                mode.movedDiagonally = true;
                callback.call(player, 1, 1);
        } else if (mode.pressed === 'left') {
                mode.movedDiagonally = true;
        }
    }
};
var directionReleased = function(mode, key, callback) {
    'use strict';
    if (mode.pressed === 'up' && (key === 'Up' || key === 'ArrowUp')) {
        mode.pressed = '';
        if (!mode.movedDiagonally) {
                callback.call(player, 0, -1);
        }
        mode.movedDiagonally = false;
    }
    else if (mode.pressed === 'left' && (key === 'Left' || key === 'ArrowLeft')) {
        mode.pressed = '';
        if (!mode.movedDiagonally) {
                callback.call(player, -1, 0);
        }
        mode.movedDiagonally = false;
    }
    else if (mode.pressed === 'down' && (key === 'Down' || key === 'ArrowDown')) {
        mode.pressed = '';
        if (!mode.movedDiagonally) {
                callback.call(player, 0, 1);
        }
        mode.movedDiagonally = false;
    }
    else if (mode.pressed === 'right' && (key === 'Right' || key === 'ArrowRight')) {
        mode.pressed = '';
        if (!mode.movedDiagonally) {
                callback.call(player, 1, 0);
        }
        mode.movedDiagonally = false;
    }
};
window.addEventListener('keydown', function(e) {
	try {
		var key = keyCodes[e.keyCode] || e.key;
		directionPressed(inputState, key, player.move);
	} catch (ex) {
		console.log(ex);
	}
}, false);
window.addEventListener('keyup', function(e) {
	try {
		var key = keyCodes[e.keyCode] || e.key;
		directionReleased(inputState, key, player.move);
	} catch (ex) {
		console.log(ex);
	}
}, false);
