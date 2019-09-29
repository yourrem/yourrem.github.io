class Canvas {
	constructor(container) {
		const canvasElement = document.createElement("canvas");
		if (!canvasElement.getContext) {
			return;
		}
		this.pixelWidth = canvasElement.width = 803;
		this.pixelHeight = canvasElement.height = 506;
		container.appendChild(canvasElement);

		this.ctx = canvasElement.getContext('2d');
		this.obj = canvasElement;
		this.setGridSize(11);
	}

	draw(cells) {
		let ctx = this.ctx;
		let size = this.cellSize;

		ctx.fillStyle = "#7e7e7e";
		ctx.lineWidth = 1;
		ctx.fillRect (0, 0, this.pixelWidth, this.pixelHeight);
		ctx.strokeStyle = "#999";

		for(let n = this.cellSize; n < this.pixelWidth; n += this.cellSize) {
			ctx.beginPath();
			ctx.moveTo(n + 0.5, 0);
			ctx.lineTo(n + 0.5, this.pixelHeight);
			ctx.stroke();
		}
		for(let n = this.cellSize; n < this.pixelHeight; n += this.cellSize) {
			ctx.beginPath();
			ctx.moveTo(0, n + 0.5);
			ctx.lineTo(this.pixelWidth, n + 0.5);
			ctx.stroke();
		}

		ctx.fillStyle = "yellow";
		ctx.lineWidth = 1;
		cells.forEach((cell, i) => {
			ctx.fillRect(cell[0] * size + 1, cell[1] * size + 1, size - 1, size - 1);
		});
	}

	click(fn) {
		this.obj.addEventListener('click', (evt) => {
			let rect = canvas.obj.getBoundingClientRect();
			let left = Math.floor(rect.left + window.pageXOffset);
			let top = Math.floor(rect.top + window.pageYOffset);
			let cellSize = canvas.cellSize;
			let clickEvent = {};
			clickEvent.cellX = Math.floor((evt.clientX - left + window.pageXOffset) / cellSize);
			clickEvent.cellY = Math.floor((evt.clientY - top + window.pageYOffset - 5) / cellSize); // TODO: Where's offset coming from?
			fn(clickEvent);
		});
	}

	getDimension() {
		return {width: this.pixelWidth, height: this.pixelHeight};
	}

	getGridSize() {
		return this.cellSize;
	}

	setGridSize(size) {
		this.cellSize = size;
		this.width = Math.floor(this.pixelWidth/this.cellSize);
		this.height = Math.floor(this.pixelHeight/this.cellSize);
	}
}

class Shape {
	constructor(canvas) {
		this.canvas = canvas;
		this.current = [];
		this.collection = [
			{name: "Clear", data:[]},
			{name: "Glider", data:[[1,0], [2,1], [2,2], [1,2], [0,2]]},
			{name: "Small Exploder", data:[[0,1], [0,2], [1,0], [1,1], [1,3], [2,1], [2,2]]},
			{name: "Exploder", data:[[0,0], [0,1], [0,2], [0,3], [0,4], [2,0], [2,4], [4,0], [4,1], [4,2], [4,3], [4,4]]},
			{name: "10 Cell Row", data:[[0,0], [1,0], [2,0], [3,0], [4,0], [5,0], [6,0], [7,0], [8,0], [9,0]]},
			{name: "Lightweight spaceship", data:[[0,1], [0,3], [1,0], [2,0], [3,0], [3,3], [4,0], [4,1], [4,2]]},
			{name: "Tumbler", data:[[0,3], [0,4], [0,5], [1,0], [1,1], [1,5], [2,0], [2,1], [2,2], [2,3], [2,4], [4,0], [4,1], [4,2], [4,3], [4,4], [5,0], [5,1], [5,5], [6,3], [6,4], [6,5]]},
			{name: "Gosper Glider Gun", data:[[0,2], [0,3], [1,2], [1,3], [8,3], [8,4], [9,2], [9,4], [10,2], [10,3], [16,4], [16,5], [16,6], [17,4], [18,5], [22,1], [22,2], [23,0], [23,2], [24,0], [24,1], [24,12], [24,13], [25,12], [25,14], [26,12], [34,0], [34,1], [35,0], [35,1], [35,7], [35,8], [35,9], [36,7], [37,8]]}
		];
	}

	get() {
		return this.current;
	}

	set(shape) {
		this.current = shape;
	}

	copy(shape) {
		let shapeCopy = shape.map((el) => {
			return [el[0], el[1]];
		});
		this.set(shapeCopy);
	}

	redraw() {
		this.canvas.draw(this.current);
	}

	center() {
		let cells = this.current;
		let shapeWidth = 0;
		let shapeHeight = 0;
		cells.forEach((cell, i) => {
			if (cell[0] > shapeWidth) {
				shapeWidth = cell[0];
			}
			if (cell[1] > shapeHeight) {
				shapeHeight = cell[1];
			}
		});

		let shapeLeft = Math.floor((this.canvas.width-shapeWidth)/2);
		let shapeTop = Math.floor((this.canvas.height-shapeHeight)/2);
		cells.forEach((cell) => {
			cell[0] += shapeLeft;
			cell[1] += shapeTop;
		});
		this.set(cells);
	}

	offset(dx, dy) {
		this.current.forEach((cell) => {
			cell[0] += dx;
			cell[1] += dy;
		});
		this.redraw();
	}

	toggle(cell) {
		let n;
		let shape = this;
		if((n = cellIndex(cell)) == -1) {
			this.current.push(cell);
		} else {
			this.current.splice(n, 1);
		}
		this.set(shape.current);
		this.redraw();

		function cellIndex(cell) {
			let index = -1;
			shape.current.forEach((c, i) => {
				if (c[0] == cell[0] && c[1] == cell[1]) {
					index = i;
					return false;
				}
			});
			return index;
		}
	}
}

class Controls {
	constructor(canvas, shape, gameoflife) {
		this.canvas = canvas;
		this.shape = shape;
		this.gameoflife = gameoflife;
		this.started = false;
		this.timer = null;
		this.generation = 0;
		//this.generationElement = document.getElementById('generation');
	}

	init(shapes) {
		let wheelDy = 0;
		let wheelDrag = 300;
		let shapesSelect = document.getElementById('shapes');
		shapes.forEach((shape, i) => {
			let option = document.createElement('option');
			option.text = shape.name;
			shapesSelect.appendChild(option);
		});
		shapesSelect.addEventListener('change', (e) => {
			controls.setGeneration(0);
			controls.shape.copy(shapes[shapesSelect.selectedIndex].data);
			controls.shape.center();
			controls.shape.redraw();
		});

		document.getElementById('next').addEventListener('click', () => {
			controls.next();
		});

        // Hiding size selector for now.
		//document.getElementById('size').addEventListener('change', sizeListener);
		//document.getElementById('size').addEventListener('input', sizeListener);

		function sizeListener() {
			let oldGridSize = controls.canvas.getGridSize();
			let newGridSize = 13 - parseInt(size.value);
			let dimension = controls.canvas.getDimension();

			let dx = Math.round((dimension.width / newGridSize - dimension.width / oldGridSize) / 2);
			let dy = Math.round((dimension.height / newGridSize - dimension.height / oldGridSize) / 2);

			controls.shape.offset(dx, dy);
			controls.canvas.setGridSize(newGridSize);
			controls.shape.redraw();
		}

		document.getElementById('canvas-div').addEventListener('wheel', (evt) => {
			wheelDy += parseInt(evt.deltaY);
			if (wheelDy > wheelDrag) {
				let gridSize = parseInt(size.value);
				if (gridSize > parseInt(size.getAttribute('min'))) {
					size.value = gridSize - 1;
				}
				wheelDy -= wheelDrag;
			} else if (wheelDy < -wheelDrag) {
				let gridSize = parseInt(size.value);
				if (gridSize < parseInt(size.getAttribute('max'))) {
					size.value = gridSize + 1;
				}
				wheelDy += wheelDrag;
			}
			evt.preventDefault();
			sizeListener();
		});

		let speed = document.getElementById('speed');
		this.speed = 520 - parseInt(speed.value);
		speed.addEventListener('change', speedListener);
		speed.addEventListener('input', speedListener);

		function speedListener() {
			controls.speed = 520 - parseInt(speed.value);
			if (controls.started) {
				controls.animate();
			}
		}

		let startStop = document.getElementById('start');
		startStop.addEventListener('click', () => {
			controls.started = !controls.started;
			if (controls.started) {
				startStop.value = 'Stop';
				controls.animate();
			} else {
				startStop.value = 'Start';
				clearInterval(controls.timer);
			}
		});

		this.canvas.click((evt) => {
			controls.setGeneration(0);
			controls.shape.toggle([evt.cellX, evt.cellY]);
		});
	}

	setGeneration(gen) {
		this.generation = gen;
		//this.generationElement.innerHTML = gen;
	}

	animate() {
		clearInterval(this.timer);
		this.timer = setInterval(function () {
			controls.next();
		}, controls.speed);
	}

	next() {
		let shape = this.shape.get();
		shape = this.gameoflife.next(shape);
		this.shape.set(shape);
		this.shape.redraw();
		this.setGeneration(this.generation + 1);
	}
}

class GameOfLife {
	constructor() {
	}

    /**
     *  TODO(you): Fill in game of life rules logic.
     */
	next(shape) {
		let neighbours = {};
		let newShape = [];
		shape.forEach((cell, i) => {
			let index;

			index = 'c'+(cell[0]-1)+','+(cell[1]-1);
			if (neighbours[index]) {
				neighbours[index].n++;
			} else {
				neighbours[index] = {n: 1, cell: [cell[0]-1, cell[1]-1]};
			}
			index = 'c'+(cell[0])+','+(cell[1]-1);
			if (neighbours[index]) {
				neighbours[index].n++;
			} else {
				neighbours[index] = {n: 1, cell: [cell[0], cell[1]-1]};
			}
			index = 'c'+(cell[0]+1)+','+(cell[1]-1);
			if (neighbours[index]) {
				neighbours[index].n++;
			} else {
				neighbours[index] = {n: 1, cell: [cell[0]+1, cell[1]-1]};
			}
			index = 'c'+(cell[0]-1)+','+(cell[1]);
			if (neighbours[index]) {
				neighbours[index].n++;
			} else {
				neighbours[index] = {n: 1, cell: [cell[0]-1, cell[1]]};
			}
			index = 'c'+(cell[0]+1)+','+(cell[1]);
			if (neighbours[index]) {
				neighbours[index].n++;
			} else {
				neighbours[index] = {n: 1, cell: [cell[0]+1, cell[1]]};
			}
			index = 'c'+(cell[0]-1)+','+(cell[1]+1);
			if (neighbours[index]) {
				neighbours[index].n++;
			} else {
				neighbours[index] = {n: 1, cell: [cell[0]-1, cell[1]+1]};
			}
			index = 'c'+(cell[0])+','+(cell[1]+1);
			if (neighbours[index]) {
				neighbours[index].n++;
			} else {
				neighbours[index] = {n: 1, cell: [cell[0], cell[1]+1]};
			}
			index = 'c'+(cell[0]+1)+','+(cell[1]+1);
			if (neighbours[index]) {
				neighbours[index].n++;
			} else {
				neighbours[index] = {n: 1, cell: [cell[0]+1, cell[1]+1]};
			}
		});
		shape.forEach((cell, i) => {
			let index = 'c' + cell[0] + ',' + cell[1];
			if (neighbours[index]) {
				neighbours[index].populated = true;
			}
		});

		for (let index in neighbours) {
			if ((neighbours[index].n == 2 && neighbours[index].populated) || neighbours[index].n == 3) {
				newShape.push(neighbours[index].cell);
			}
		}
		return newShape;
	}
}

const canvasElement = document.getElementById('canvas-div');
const canvas = new Canvas(canvasElement);
const shape = new Shape(canvas);
const gameOfLife = new GameOfLife(canvas);
const controls = new Controls(canvas, shape, gameOfLife);

controls.init(shape.collection);
controls.shape.copy(shape.collection[1].data);
controls.shape.center();
controls.shape.redraw();
