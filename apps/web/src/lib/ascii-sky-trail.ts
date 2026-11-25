const FIELD_WIDTH = 384;
const FADE_SECONDS = 0.32;
const MAX_SEGMENTS = 128;
const BRUSH_LAYERS = [
	{ opacity: 0.12, width: 1.7 },
	{ opacity: 0.32, width: 1 },
	{ opacity: 0.85, width: 0.5 },
] as const;

interface TrailPoint {
	time: number;
	x: number;
	y: number;
}

interface TrailSegment {
	directionX: number;
	directionY: number;
	end: TrailPoint;
	start: TrailPoint;
	width: number;
}

export interface SkyTrail {
	canvas: HTMLCanvasElement;
	clear: () => void;
	leave: () => void;
	move: (x: number, y: number, time: number) => void;
	resize: (width: number, height: number) => void;
	update: (now: number) => boolean;
}

export function createSkyTrail(): SkyTrail {
	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d", { alpha: false });
	let width = 1;
	let height = 1;
	let previous: TrailPoint | null = null;
	let directionX = 0;
	let directionY = 0;
	let updatedAt = 0;
	let activeUntil = 0;
	let dirty = true;
	const segments: TrailSegment[] = [];

	const clear = (): void => {
		if (context) {
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.globalAlpha = 1;
			// R/G encode direction around neutral; B carries the trail's strength.
			context.fillStyle = "rgb(128 128 0)";
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		previous = null;
		segments.length = 0;
		activeUntil = 0;
		updatedAt = 0;
		directionX = 0;
		directionY = 0;
		dirty = true;
	};

	const move = (x: number, y: number, time: number): void => {
		const point = { time, x, y };
		if (!previous) {
			previous = point;
			return;
		}
		const dx = x - previous.x;
		const dy = y - previous.y;
		const distance = Math.hypot(dx, dy);
		if (distance < 0.25) {
			return;
		}
		const elapsed = Math.max(time - previous.time, 1);
		const smoothing = 1 - Math.exp(-elapsed / 28);
		directionX += (dx / distance - directionX) * smoothing;
		directionY += (dy / distance - directionY) * smoothing;
		const directionLength = Math.hypot(directionX, directionY) || 1;
		segments.push({
			directionX: directionX / directionLength,
			directionY: directionY / directionLength,
			end: point,
			start: previous,
			width: 13 + Math.min(distance / elapsed, 2.5) * 7,
		});
		if (segments.length > MAX_SEGMENTS) {
			segments.shift();
		}
		activeUntil = performance.now() + 1400;
		previous = point;
	};

	const update = (now: number): boolean => {
		if (!context) {
			return false;
		}
		if (!activeUntil) {
			const shouldUpload = dirty;
			dirty = false;
			return shouldUpload;
		}
		if (now > activeUntil && segments.length === 0) {
			clear();
			dirty = false;
			return true;
		}

		const elapsed = updatedAt
			? Math.min((now - updatedAt) / 1000, 0.1)
			: 1 / 60;
		updatedAt = now;
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.globalAlpha = 1 - Math.exp(-elapsed / FADE_SECONDS);
		context.fillStyle = "rgb(128 128 0)";
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.setTransform(
			canvas.width / width,
			0,
			0,
			canvas.height / height,
			0,
			0
		);
		context.lineCap = "round";
		context.lineJoin = "round";

		for (const segment of segments) {
			const red = Math.round(128 + segment.directionX * 127);
			const green = Math.round(128 + segment.directionY * 127);
			context.strokeStyle = `rgb(${red} ${green} 255)`;
			for (const layer of BRUSH_LAYERS) {
				context.globalAlpha = layer.opacity;
				context.lineWidth = segment.width * layer.width;
				context.beginPath();
				context.moveTo(segment.start.x, segment.start.y);
				context.lineTo(segment.end.x, segment.end.y);
				context.stroke();
			}
		}
		context.globalAlpha = 1;
		segments.length = 0;
		dirty = false;
		return true;
	};

	return {
		canvas,
		clear,
		leave: () => {
			previous = null;
			directionX = 0;
			directionY = 0;
		},
		move,
		resize: (nextWidth, nextHeight) => {
			width = Math.max(nextWidth, 1);
			height = Math.max(nextHeight, 1);
			canvas.width = FIELD_WIDTH;
			canvas.height = Math.max(
				64,
				Math.min(768, Math.round((FIELD_WIDTH * height) / width))
			);
			clear();
		},
		update,
	};
}
