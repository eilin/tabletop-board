import React, { Component } from 'react';
import { v4 } from 'uuid';
import Pusher from 'pusher-js';

class Canvas extends Component {
	constructor(props) {
		super(props);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.endPaintEvent = this.endPaintEvent.bind(this);
		this.pusher = new Pusher('c91485ea4b39d895b9d5', {
			cluster: 'us2',
		});
		this.boardApiUrl = process.env.REACT_APP_PAINT_URL || 'http://localhost:4000/paint'
	}

	isPainting = false;
	// Different stroke styles to be used for user and guest
	userStrokeStyle = '#EE92C2';
	guestStrokeStyle = '#F0C987';
	line = [];
	// v4 creates a unique id for each user. We used this since there's no auth to tell users apart
	userId = v4();
	prevPos = { offsetX: 0, offsetY: 0 };

	onMouseDown({ nativeEvent }) {
		const { offsetX, offsetY } = nativeEvent;
		this.isPainting = true;
		this.prevPos = { offsetX, offsetY };
	}

	onMouseMove({ nativeEvent }) {
		if (this.isPainting) {
			const { offsetX, offsetY } = nativeEvent;
			const offSetData = { offsetX, offsetY };
			// Set the start and stop position of the paint event.
			const positionData = {
				start: { ...this.prevPos },
				stop: { ...offSetData },
			};
			// Add the position to the line array
			this.line = this.line.concat(positionData);
			this.paint(this.prevPos, offSetData, this.userStrokeStyle);
		}
	}
	endPaintEvent() {
		if (this.isPainting) {
			this.isPainting = false;
			this.sendPaintData();
		}
	}
	drawBoard() {
		let tileSize = 40;
		let n = 10;
		let p = 0;
		//draw verticals
		for (let i = 0; i <= n; i++) {
			this.ctx.moveTo(p + i * tileSize, p);
			this.ctx.lineTo(p + i * tileSize, n * tileSize + p);
		}
		//draw horizontals
		for (let i = 0; i <= n; i++) {
			this.ctx.moveTo(p, p + i * tileSize);
			this.ctx.lineTo(n * tileSize + p, p + i * tileSize);
		}
		this.ctx.strokeStyle = "lightgrey";
		this.ctx.stroke();
	}
	paint(prevPos, currPos, strokeStyle) {
		const { offsetX, offsetY } = currPos;
		const { offsetX: x, offsetY: y } = prevPos;

		this.ctx.beginPath();
		this.ctx.strokeStyle = strokeStyle;
		// Move the the prevPosition of the mouse
		this.ctx.moveTo(x, y);
		// Draw a line to the current position of the mouse
		this.ctx.lineTo(offsetX, offsetY);
		// Visualize the line using the strokeStyle
		this.ctx.stroke();
		this.prevPos = { offsetX, offsetY };
	}

	async sendPaintData() {
		const body = {
			line: this.line,
			userId: this.userId,
		};
		// We use the native fetch API to make requests to the server
		console.log("POST " + this.boardApiUrl);
		const req = await fetch(this.boardApiUrl, {
			method: 'post',
			body: JSON.stringify(body),
			headers: {
				'content-type': 'application/json',
			},
		});
		const res = await req.json();
		this.line = [];
	}

	componentDidMount() {
		// Here we set up the properties of the canvas element. 
		this.canvas.width = 1000;
		this.canvas.height = 800;
		this.ctx = this.canvas.getContext('2d');
		this.ctx.lineJoin = 'round';
		this.ctx.lineCap = 'round';
		this.ctx.lineWidth = 5;
		const channel = this.pusher.subscribe('painting');
		channel.bind('draw', (data) => {
			const { userId, line } = data;
			if (userId !== this.userId) {
				line.forEach((position) => {
					this.paint(position.start, position.stop, this.guestStrokeStyle);
				});
			}
		});
		this.drawBoard();
	}

	render() {
		return (
			<canvas
				// We use the ref attribute to get direct access to the canvas element. 
				ref={(ref) => (this.canvas = ref)}
				style={{ background: 'black' }}
				onMouseDown={this.onMouseDown}
				onMouseLeave={this.endPaintEvent}
				onMouseUp={this.endPaintEvent}
				onMouseMove={this.onMouseMove}
			/>
		);
	}
}
export default Canvas;