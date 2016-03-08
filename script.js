'use strict';

var getById = document.getElementById.bind(document);

// message buffer
var buffer = getById('buffer');
var log = function(str) {
	if (!str) {
		buffer.setAttribute('class', {
			age0: 'age1',
			age1: 'age2',
			age2: 'age3',
			age3: 'age4',
			age4: 'age4'
		}[buffer.getAttribute('class')]);
	} else if (buffer.getAttribute('class') === 'age0') {
		buffer.innerHTML += str;
	} else {
		buffer.setAttribute('class', 'age0');
		buffer.innerHTML = str;
	}
};

// define display
var display = {
	element: getById('display'),
	width: 60,
	height: 28
};
for (var y = 0; y < display.height; y++) {
	var row = document.createElement('div');
	for (var x = 0; x < display.width; x++) {
		var tile = document.createElement('span');
		tile.innerHTML = ' ';
		row.appendChild(tile);
	}
	display.element.appendChild(row);
}
// center it
getById('game').style.width = getById('display').clientWidth + 1 + 'px';
getById('game').style.height = getById('buffer').clientHeight + getById('display').clientHeight + getById('stats').clientHeight + 'px';

// Palette by Arne
var colors = {
	void: 		'#000000',
	ash: 		'#9D9D9D',
	blind: 		'#FFFFFF',
	bloodred: 	'#BE2633',
	pigmeat: 	'#E06F8B',
	oldpoop: 	'#493C2B',
	newpoop: 	'#A46422',
	blaze: 		'#EB8931',
	zornskin: 	'#F7E26B',
	shadegreen: '#2F484E',
	leafgreen: 	'#44891A',
	slimegreen: '#A3CE27',
	nightblue: 	'#1B2632',
	seablue: 	'#005784',
	skyblue: 	'#31A2F2',
	cloudblue: 	'#B2DCEF',
	transparent: 'transparent'
};

var blank = function() {};

var schedule;

var tiles = {
	empty: {
		char: ' ',
		color: 'transparent',
		passable: false,
		transparent: false
	},
	floor: {
		char: '.',
		color: 'blind',
		passable: true,
		transparent: true
	},
	vertical: {
		char: '│',
		color: 'blind',
		passable: false,
		transparent: false
	},
	horizontal: {
		char: '─',
		color: 'blind',
		passable: false,
		transparent: false
	},
	topRight: {
		char: '┐',
		color: 'blind',
		passable: false,
		transparent: false
	},
	topLeft: {
		char: '┌',
		color: 'blind',
		passable: false,
		transparent: false
	},
	bottomRight: {
		char: '┘',
		color: 'blind',
		passable: false,
		transparent: false
	},
	bottomLeft: {
		char: '└',
		color: 'blind',
		passable: false,
		transparent: false
	},
	door: {
		char: '+',
		color: 'cloudblue',
		passable: true,
		transparent: false
	},
	openDoor: {
		char: '/',
		color: 'cloudblue',
		passable: true,
		transparent: true
	},
	corridor: {
		char: '#',
		color: 'ash',
		passable: true,
		transparent: true
	}
};

var newTile = function(tile) {
	return Object.create(tiles[tile]);
}

var distance = function(dx, dy) {
	dx = Math.abs(dx);
	dy = Math.abs(dy);
	return Math.max(dx, dy) + Math.min(dx, dy) / 2;
};

var act = function() {
	if (this.dead) {
		return schedule.advance().act();
	} else {
		return this[this.state]();
	}
};

var sleeping = function() {
	if (level[this.x][this.y].visible) {
		this.state = 'hunting';
		return this.act();
	} else {
		schedule.add(this, this.delay);
		return schedule.advance().act();
	}
};

var hunting = function() {
	var mx = 0, my = 0;
	var dist = Infinity;
	for (var i = 0; i < 9; i++) {
		var dx = rlt.dir9[i][0];
		var dy = rlt.dir9[i][1];
		var newdist = distance(this.x+dx-player.x, this.y+dy-player.y);
		var tile = level[this.x+dx][this.y+dy];
		if (tile.passable && (!tile.actor || tile.actor === player || tile.actor === this) && newdist < dist) {
			dist = newdist;
			mx = dx;
			my = dy;
		}
	}
	return this.move(mx, my);
};

var batHunting = function() {
	var mx = 0, my = 0;
	var dist = Infinity;
	for (var i = 0; i < 9; i++) {
		var dx = rlt.dir9[i][0];
		var dy = rlt.dir9[i][1];
		var newdist = distance(this.x+dx-player.x, this.y+dy-player.y);
		var tile = level[this.x+dx][this.y+dy];
		if (tile.passable && (!tile.actor || tile.actor === player || tile.actor === this) && newdist + 2 * Math.random() < dist) {
			dist = newdist;
			mx = dx;
			my = dy;
		}
	}
	return this.move(mx, my);
};

var haunt = function() {
	this.dead = true;
	level[this.x][this.y].actor = undefined;
};

var attack = function(actor) {
	if (this === player) {
		log('You hit the ' + actor.name + '. ');
	} else if (actor === player) {
		log('The ' + this.name + ' hits you. ');
	}
	actor.gainHp(-this.dmg);
	schedule.add(this, this.delay);
	return schedule.advance().act();
}

var gainHp = function(hp) {
	this.hp += hp;
	if (hp < 0 && this.hp > 0) {
		animationQueue.push(function(callback) {
			console.log(1);
			var tile = display.element.childNodes[this.y].childNodes[this.x];
			tile.setAttribute('class', 'damaged' + this.color);
			setTimeout(tile.setAttribute.bind(tile, 'class', ''), 500);
			callback();
		}.bind(this));
	}
	if (this.hp <= 0) {
		this.hp = 0;
		this.dead = true;
	}
};

var move = function(dx, dy) {
	if (level[this.x+dx][this.y+dy].actor) {
		return this.attack(level[this.x+dx][this.y+dy].actor);
	} else if (level[this.x+dx][this.y+dy].passable) {
		level[this.x][this.y].actor = undefined;
		if (this.exitDoor &&
		   (level[this.x][this.y].char === '+' ||
			level[this.x][this.y].char === '/')) {
			this.exitDoor(dx, dy);
		}
		this.x += dx;
		this.y += dy;
		level[this.x][this.y].actor = this;
		if (this.enterDoor && level[this.x][this.y].char === '+') {
			this.enterDoor();
		}
		schedule.add(this, this.delay);
		return schedule.advance().act();
	}
};

var exitDoor = function(dx, dy) {
	var room = level[this.x][this.y].room;
	if (level[this.x+dx][this.y+dy].char === '#') {
		level[this.x][this.y] = newTile('openDoor');
		this.enterDoor = blank;
	} else {
		level[this.x][this.y] = newTile('door');
		this.enterDoor = enterCorridor;
	}
	level[this.x][this.y].room = room;
};

var enterCorridor = function() {
	var thisRoom = level[this.x][this.y].room;
	// destroy all monsters outside
	for (x = 0; x < display.width; x++) for (var y = 0; y < display.height; y++) {
		if (level[x][y].room !== thisRoom && level[x][y].actor) {
			level[x][y].actor.haunt();
		}
	}
	// destroy all other rooms
	for (x = 0; x < display.width; x++) for (var y = 0; y < display.height; y++) {
		if (level[x][y].room !== thisRoom) {
			level[x][y] = newTile('empty');
		}
	}
	// find facing
	var facing;
	if (level[this.x-1][this.y].char === '.') {
		facing = 'right';
	} else if (level[this.x+1][this.y].char === '.') {
		facing = 'left';
	} else if (level[this.x][this.y-1].char === '.') {
		facing = 'bottom';
	} else {
		facing = 'top';
	}
	var opposite = {
		top: 'bottom',
		bottom: 'top',
		left: 'right',
		right: 'left'
	};
	var orientation = {
		top: 'vertical',
		bottom: 'vertical',
		left: 'horizontal',
		right: 'horizontal'
	};
	// make a new room and add monsters
	var width = rlt.random(6, 9);
	var height = rlt.random(6, 9);
	if (facing === 'bottom') {
		var xpos = rlt.random(0, display.width-width);
		var ypos = rlt.random(this.y+2, display.height-height);
	} else if (facing === 'top') {
		var xpos = rlt.random(0, display.width-width);
		var ypos = rlt.random(0, this.y-height-1);
	} else if (facing === 'right') {
		var xpos = rlt.random(this.x+2, display.width-width);
		var ypos = rlt.random(0, display.height-height);
	} else {
		var xpos = rlt.random(0, this.x-width-1);
		var ypos = rlt.random(0, display.height-height);
	}
	addMonsters(makeRoom(xpos, ypos, width, height));
	// add doors
	var chance = {};
	if (xpos > 10) chance.left = 2/3;
	if (ypos > 10) chance.top = 2/3;
	if (xpos+width < display.width-9) chance.right = 2/3;
	if (ypos+height < display.height-9) chance.bottom = 2/3;
	chance[opposite[facing]] = 1;
	var doors = addDoors(xpos, ypos, width, height, chance);
	// add a corridor
	makeCorridor(this, doors[opposite[facing]], orientation[facing]);
};

var asActor = function(obj) {
	var actor = Object.create({
		color: 'blind',
		delay: 100,
		state: 'sleeping',
		act: act,
		move: move,
		sleeping: sleeping,
		attack: attack,
		hunting: hunting,
		haunt: haunt,
		gainHp: gainHp,
		hp: 2,
		dmg: 1
	});
	for (var prop in obj) {
		actor[prop] = obj[prop];
	}
	return actor;
};

var animationQueue = [];
var animate = function() {
	return animationQueue[0] ? animationQueue.shift()(animate) : blank;
};

var player = asActor({
	char: '@',
	enterDoor: enterCorridor,
	exitDoor: exitDoor,
	hp: 12
});
player.act = function() {
	log();
	for (var x = 0; x < display.width; x++) for (var y = 0; y < display.height; y++) {
		level[x][y].visible = false;
	}
	rlt.shadowcast(player.x, player.y, function(x, y) {
		return level[x][y].transparent;
	}, function(x, y) {
		level[x][y].visible = true;
	});
	draw();
	animate();
};

var monsters = {
	bat: asActor({ // haunt restricts player's fov
		name: 'bat',
		char: 'b',
		color: 'newpoop',
		hunting: batHunting
	}),
	titan: asActor({ // blocks fov, destroys things once it reaches a doorway
		name: 'titan',
		char: 'T',
		delay: 200
	}),
	worm: asActor({ // unrestricted by walls, not killed by haunt
		name: 'worm',
		char: 'W',
		delay: 200
	})
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
	'/': 0,
	'b': 1,
	'r': 4
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
	'/': 5,
	'b': 2,
	'r': 3
};

// define level
var level = [];
for (var x = 0; x < display.width; x++) {
	level[x] = [];
}

var draw = function() {
	for (var y = 0; y < display.height; y++) {
		var $row = display.element.childNodes[y];
		for (var x = 0; x < display.width; x++) {
			var $tile = $row.childNodes[x];
			var tile = level[x][y];
			if (tile.visible) {
				if (tile.actor && !tile.actor.dead)
					tile = tile.actor;
				if ($tile.innerHTML = tile.char)
					$tile.innerHTML = tile.char;
				$tile.style.color = colors[tile.color];
			} else {
				$tile.style.color = 'transparent';
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
	var doorTop    = false;
	var doorRight  = false;
	var doorBottom = false;
	var doorLeft   = false;
	chance = chance || {};
	chance.top    = chance.top    || 0;
	chance.right  = chance.right  || 0;
	chance.bottom = chance.bottom || 0;
	chance.left   = chance.left   || 0;
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
};

var addMonsters = function(room) {
	var x = 0, y = 0;
	while (!level[x][y].passable || level[x][y].actor) {
		x = rlt.random(room.x+1, room.x+room.w-1);
		y = rlt.random(room.y+1, room.y+room.h-1);
	}
	var bat = Object.create(monsters.bat);
	bat.x = x;
	bat.y = y;
	level[x][y].actor = bat;
	schedule.add(bat, 1);
};

// start game
var start = function() {
	for (var x = 0; x < display.width; x++) for (var y = 0; y < display.height; y++) {
		level[x][y] = newTile('empty');
	}

	makeRoom(26, 11, 7, 7);
	addDoors(26, 11, 7, 7, {
		top: 1,
		right: 1,
		bottom: 1,
		left: 1
	});

	player.x = rlt.random(27, 31);
	player.y = rlt.random(12, 16);
	level[player.x][player.y].actor = player;

	schedule = rlt.Schedule();
	schedule.add(player, 0);
	schedule.advance().act();
};

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

start();
