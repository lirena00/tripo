import { createSkyTrail } from "./ascii-sky-trail";

const GLYPHS = " .,:;=()oO08%#@/\\|~₹$";
const ATLAS_CELL = 24;
const FRAME_INTERVAL = 1000 / 60;

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// The expensive cloud shapes run once per character cell, not once per screen pixel.
const SCENE_SHADER = `
precision highp float;
uniform vec2 uFieldResolution;
uniform vec2 uCellSize;
uniform vec2 uResolution;
uniform float uCloudTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
}

float cloud(vec2 p, vec2 center, float scale, float period) {
  vec2 offset = p - center;
  offset.x = mod(offset.x + period * 0.5, period) - period * 0.5;
  vec2 q = offset / scale;
  q += vec2(noise(q * 3.0), noise(q * 3.0 + 7.0)) * 0.10;
  float d = length((q - vec2(-0.52, 0.09)) / vec2(0.59, 0.35));
  d = min(d, length((q - vec2(-0.12, -0.17)) / vec2(0.46, 0.64)));
  d = min(d, length((q - vec2(0.34, -0.02)) / vec2(0.53, 0.49)));
  d = min(d, length((q - vec2(0.75, 0.13)) / vec2(0.44, 0.29)));
  d = min(d, length((q - vec2(0.10, 0.24)) / vec2(0.88, 0.23)));
  return 1.0 - d + (noise(q * 17.0) - 0.5) * 0.19;
}

void main() {
  vec2 center = vec2(gl_FragCoord.x, uFieldResolution.y - gl_FragCoord.y) * uCellSize;
  vec2 p = center / uResolution.y;
  float period = max(uResolution.x / uResolution.y, 1.8);
  p.x -= uCloudTime * 0.014;
  float d = cloud(p, vec2(period * 0.12, 0.25), 0.18, period);
  d = max(d, cloud(p, vec2(period * 0.43, 0.17), 0.24, period));
  d = max(d, cloud(p, vec2(period * 0.77, 0.28), 0.17, period));
  d = max(d, cloud(p, vec2(period * 0.96, 0.45), 0.21, period));
  d = max(d, cloud(p, vec2(period * 0.29, 0.53), 0.15, period));
  d = max(d, cloud(p, vec2(period * 0.68, 0.61), 0.23, period));
  float fill = smoothstep(-0.07, 0.22, d);
  float shadow = smoothstep(-0.1, 0.4, d) * (1.0 - smoothstep(0.1, 0.65, d));
  float atmosphere = noise(p * 6.0 + vec2(uCloudTime * 0.018, 0.0));
  gl_FragColor = vec4(fill, shadow, atmosphere, noise(p * 90.0));
}
`;

const ASCII_SHADER = `
precision highp float;
uniform vec2 uResolution;
uniform vec2 uFieldResolution;
uniform vec2 uCellSize;
uniform float uPixelRatio;
uniform float uMotion;
uniform vec3 uPaper;
uniform vec3 uPrimary;
uniform vec3 uSky;
uniform vec4 uClearRegion;
uniform sampler2D uAtlas;
uniform sampler2D uScene;
uniform sampler2D uTrail;

float glyphAt(float index, vec2 local) {
  return texture2D(uAtlas, vec2((index + local.x) / ${GLYPHS.length}.0, local.y)).a;
}

float directionGlyph(vec2 direction) {
  if (abs(direction.x) > abs(direction.y) * 2.2) return ${GLYPHS.indexOf("~")}.0;
  if (abs(direction.y) > abs(direction.x) * 2.2) return ${GLYPHS.indexOf("|")}.0;
  return direction.x * direction.y > 0.0 ? ${GLYPHS.indexOf("\\")}.0 : ${GLYPHS.indexOf("/")}.0;
}

float currencyGlyph(float noise) {
  return noise > 0.65 ? ${GLYPHS.indexOf("$")}.0 : ${GLYPHS.indexOf("₹")}.0;
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y * uPixelRatio - gl_FragCoord.y) / uPixelRatio;
  vec2 cell = floor(pixel / uCellSize);
  vec2 local = fract(pixel / uCellSize);
  vec2 center = (cell + 0.5) * uCellSize;
  vec3 flow = texture2D(uTrail, center / uResolution).rgb;
  vec2 velocity = flow.rg - vec2(128.0 / 255.0);
  vec2 direction = velocity / max(length(velocity), 0.001);
  float influence = smoothstep(0.02, 0.6, flow.b) * uMotion;
  vec2 fieldUV = (cell + 0.5 + direction * influence * 0.85) / uFieldResolution;
  vec4 scene = texture2D(uScene, vec2(fieldUV.x, 1.0 - fieldUV.y));
  vec3 sky = mix(uPaper, mix(uSky, uPrimary, 0.09), 0.62 + scene.b * 0.22);
  vec3 base = mix(sky, mix(uPaper, vec3(1.0), 0.85), scene.r);
  vec3 ink = mix(uPrimary, uPaper, 0.56);
  float index = 1.0;
  float glyphStrength = 0.42;

  if (scene.r > 0.12) {
    index = floor(clamp(scene.g * 11.0 + scene.a * 2.0, 1.0, 13.0));
    ink = mix(uPrimary, uPaper, 0.39);
    glyphStrength = mix(0.13, 0.68, scene.g);
    if (scene.a > 0.45) {
      index = currencyGlyph(scene.a);
    }
  }

  float grid = max(smoothstep(0.88, 1.0, local.x), smoothstep(0.91, 1.0, local.y));
  base = mix(base, uPaper, grid * 0.62);
  vec3 color = mix(base, ink, glyphAt(index, local) * glyphStrength);
  float trailGlyph = influence > 0.4 ? currencyGlyph(scene.a) : directionGlyph(direction);
  color = mix(color, uPrimary, glyphAt(trailGlyph, local) * influence * 0.94);

  // Preserve the straight sides and vertical feathering of the centered layout.
  float left = floor(uClearRegion.x / uCellSize.x) * uCellSize.x;
  float right = ceil(uClearRegion.z / uCellSize.x) * uCellSize.x;
  float sides = step(left, pixel.x) * (1.0 - step(right, pixel.x));
  float top = smoothstep(uClearRegion.y - 110.0, uClearRegion.y, pixel.y);
  float bottom = 1.0 - smoothstep(uClearRegion.w, uClearRegion.w + 110.0, pixel.y);
  float horizonFade = smoothstep(0.60, 0.96, pixel.y / uResolution.y);
  float topFade = 1.0 - smoothstep(0.0, 0.08, pixel.y / uResolution.y);
  color = mix(color, uPaper, max(sides * top * bottom, max(horizonFade, topFade)));
  gl_FragColor = vec4(color, 1.0);
}
`;

interface SkyController {
	destroy: () => void;
}

function compileShader(
	gl: WebGLRenderingContext,
	type: number,
	source: string
): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) {
		return null;
	}
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createProgram(
	gl: WebGLRenderingContext,
	source: string
): WebGLProgram | null {
	const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
	const fragment = compileShader(gl, gl.FRAGMENT_SHADER, source);
	const program = gl.createProgram();
	if (!(vertex && fragment && program)) {
		gl.deleteShader(vertex);
		gl.deleteShader(fragment);
		gl.deleteProgram(program);
		return null;
	}
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.bindAttribLocation(program, 0, "aPosition");
	gl.linkProgram(program);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

function bindProgram(gl: WebGLRenderingContext, program: WebGLProgram): void {
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
	gl.useProgram(program);
}

function createTexture(
	gl: WebGLRenderingContext,
	unit: number,
	filter: number
): WebGLTexture | null {
	const texture = gl.createTexture();
	gl.activeTexture(unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return texture;
}

function makeAtlas(): HTMLCanvasElement {
	const atlas = document.createElement("canvas");
	atlas.width = GLYPHS.length * ATLAS_CELL;
	atlas.height = ATLAS_CELL;
	const context = atlas.getContext("2d");
	if (!context) {
		return atlas;
	}
	context.fillStyle = "white";
	context.font = "bold 20px monospace";
	context.textAlign = "center";
	context.textBaseline = "middle";
	let index = 0;
	for (const glyph of GLYPHS) {
		context.fillText(glyph, (index + 0.5) * ATLAS_CELL, ATLAS_CELL * 0.52);
		index += 1;
	}
	return atlas;
}

function readThemeColor(style: CSSStyleDeclaration, name: string): number[] {
	const sample = document.createElement("canvas");
	sample.width = 1;
	sample.height = 1;
	const context = sample.getContext("2d");
	if (!context) {
		return [0.98, 0.98, 0.97];
	}
	context.fillStyle = style.getPropertyValue(name).trim();
	context.fillRect(0, 0, 1, 1);
	const { data } = context.getImageData(0, 0, 1, 1);
	return [data[0] / 255, data[1] / 255, data[2] / 255];
}

export function createAsciiSky(
	canvas: HTMLCanvasElement,
	surface: HTMLElement
): SkyController {
	const gl = canvas.getContext("webgl", {
		alpha: false,
		antialias: false,
		depth: false,
		powerPreference: "low-power",
	});
	if (!gl) {
		return { destroy: () => undefined };
	}
	delete canvas.dataset.ready;
	const sceneProgram = createProgram(gl, SCENE_SHADER);
	const asciiProgram = createProgram(gl, ASCII_SHADER);
	const buffer = gl.createBuffer();
	const atlasTexture = createTexture(gl, gl.TEXTURE0, gl.LINEAR);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		makeAtlas()
	);
	const sceneTexture = createTexture(gl, gl.TEXTURE1, gl.NEAREST);
	const trailTexture = createTexture(gl, gl.TEXTURE2, gl.LINEAR);
	const framebuffer = gl.createFramebuffer();
	if (
		!(
			sceneProgram &&
			asciiProgram &&
			buffer &&
			atlasTexture &&
			sceneTexture &&
			trailTexture &&
			framebuffer
		)
	) {
		gl.deleteProgram(sceneProgram);
		gl.deleteProgram(asciiProgram);
		gl.deleteBuffer(buffer);
		gl.deleteTexture(atlasTexture);
		gl.deleteTexture(sceneTexture);
		gl.deleteTexture(trailTexture);
		gl.deleteFramebuffer(framebuffer);
		return { destroy: () => undefined };
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		gl.STATIC_DRAW
	);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	const sceneUniforms = {
		cellSize: gl.getUniformLocation(sceneProgram, "uCellSize"),
		fieldResolution: gl.getUniformLocation(sceneProgram, "uFieldResolution"),
		resolution: gl.getUniformLocation(sceneProgram, "uResolution"),
		time: gl.getUniformLocation(sceneProgram, "uCloudTime"),
	};
	const uniforms = {
		cellSize: gl.getUniformLocation(asciiProgram, "uCellSize"),
		clearRegion: gl.getUniformLocation(asciiProgram, "uClearRegion"),
		fieldResolution: gl.getUniformLocation(asciiProgram, "uFieldResolution"),
		motion: gl.getUniformLocation(asciiProgram, "uMotion"),
		paper: gl.getUniformLocation(asciiProgram, "uPaper"),
		pixelRatio: gl.getUniformLocation(asciiProgram, "uPixelRatio"),
		primary: gl.getUniformLocation(asciiProgram, "uPrimary"),
		resolution: gl.getUniformLocation(asciiProgram, "uResolution"),
		sky: gl.getUniformLocation(asciiProgram, "uSky"),
	};
	bindProgram(gl, asciiProgram);
	gl.uniform1i(gl.getUniformLocation(asciiProgram, "uAtlas"), 0);
	gl.uniform1i(gl.getUniformLocation(asciiProgram, "uScene"), 1);
	gl.uniform1i(gl.getUniformLocation(asciiProgram, "uTrail"), 2);
	const trail = createSkyTrail();
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	let fieldWidth = 1;
	let fieldHeight = 1;
	let frame = 0;
	let lastTick = 0;
	let lastRender = 0;
	let frameBudget = FRAME_INTERVAL;
	let cloudTime = 0;
	let visible = true;
	let disposed = false;
	let ready = false;

	const render = (now: number, motionEnabled: boolean): void => {
		if (motionEnabled && lastRender) {
			cloudTime += Math.min((now - lastRender) / 1000, 0.1);
		}
		if (trail.update(now)) {
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, trailTexture);
			gl.texSubImage2D(
				gl.TEXTURE_2D,
				0,
				0,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				trail.canvas
			);
		}

		bindProgram(gl, sceneProgram);
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.viewport(0, 0, fieldWidth, fieldHeight);
		gl.uniform1f(sceneUniforms.time, cloudTime);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		bindProgram(gl, asciiProgram);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform1f(uniforms.motion, motionEnabled ? 1 : 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		if (!ready) {
			canvas.dataset.ready = "true";
			ready = true;
		}
		lastRender = now;
	};

	const draw = (now: number): void => {
		frame = 0;
		const stopped =
			disposed || !visible || document.hidden || gl.isContextLost();
		if (stopped) {
			return;
		}
		const motionEnabled = !reducedMotion.matches;
		frameBudget += lastTick ? Math.min(now - lastTick, 100) : 0;
		lastTick = now;
		if (frameBudget >= FRAME_INTERVAL - 0.5 || !motionEnabled) {
			frameBudget = Math.max(0, frameBudget - FRAME_INTERVAL);
			render(now, motionEnabled);
		}
		if (motionEnabled) {
			frame = requestAnimationFrame(draw);
		}
	};

	const refresh = (): void => {
		frameBudget = FRAME_INTERVAL;
		if (!(frame || disposed || !visible || document.hidden)) {
			lastTick = 0;
			lastRender = 0;
			frame = requestAnimationFrame(draw);
		}
	};

	const resize = (): void => {
		const bounds = canvas.getBoundingClientRect();
		const { width, height } = bounds;
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
		const cellWidth = width < 600 ? 7 : 8;
		const cellHeight = cellWidth * 1.35;
		fieldWidth = Math.max(1, Math.ceil(width / cellWidth));
		fieldHeight = Math.max(1, Math.ceil(height / cellHeight));
		canvas.width = Math.max(1, Math.round(width * pixelRatio));
		canvas.height = Math.max(1, Math.round(height * pixelRatio));
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			fieldWidth,
			fieldHeight,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null
		);
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			sceneTexture,
			0
		);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		trail.resize(width, height);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, trailTexture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			trail.canvas
		);

		bindProgram(gl, sceneProgram);
		gl.uniform2f(sceneUniforms.resolution, width, height);
		gl.uniform2f(sceneUniforms.fieldResolution, fieldWidth, fieldHeight);
		gl.uniform2f(sceneUniforms.cellSize, cellWidth, cellHeight);
		bindProgram(gl, asciiProgram);
		gl.uniform2f(uniforms.resolution, width, height);
		gl.uniform2f(uniforms.fieldResolution, fieldWidth, fieldHeight);
		gl.uniform2f(uniforms.cellSize, cellWidth, cellHeight);
		gl.uniform1f(uniforms.pixelRatio, pixelRatio);
		const content = surface
			.querySelector(".landing-hero-copy, [data-sky-clear]")
			?.getBoundingClientRect();
		if (content) {
			gl.uniform4f(
				uniforms.clearRegion,
				content.left - bounds.left - 24,
				content.top - bounds.top - 18,
				content.right - bounds.left + 24,
				// Keep the clear column connected to the white section below the hero.
				height
			);
		}
		const style = getComputedStyle(surface);
		gl.uniform3fv(uniforms.paper, readThemeColor(style, "--background"));
		gl.uniform3fv(uniforms.primary, readThemeColor(style, "--primary"));
		gl.uniform3fv(uniforms.sky, readThemeColor(style, "--sky-mint"));
		refresh();
	};

	const pointerMove = (event: PointerEvent): void => {
		if (event.pointerType === "touch" || reducedMotion.matches) {
			return;
		}
		const bounds = canvas.getBoundingClientRect();
		const samples = event.getCoalescedEvents?.() ?? [];
		for (const sample of samples.length ? samples : [event]) {
			trail.move(
				sample.clientX - bounds.left,
				sample.clientY - bounds.top,
				sample.timeStamp
			);
		}
	};
	const onMotionChange = (): void => {
		trail.clear();
		refresh();
	};
	const onContextLost = (): void => {
		cancelAnimationFrame(frame);
		frame = 0;
		ready = false;
		delete canvas.dataset.ready;
	};
	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(canvas);
	resizeObserver.observe(surface);
	const content = surface.querySelector(".landing-hero-copy, [data-sky-clear]");
	if (content) {
		resizeObserver.observe(content);
	}
	const intersectionObserver = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		refresh();
	});
	intersectionObserver.observe(canvas);
	surface.addEventListener("pointermove", pointerMove, { passive: true });
	surface.addEventListener("pointerleave", trail.leave);
	canvas.addEventListener("webglcontextlost", onContextLost);
	document.addEventListener("visibilitychange", refresh);
	reducedMotion.addEventListener("change", onMotionChange);
	resize();

	return {
		destroy: () => {
			disposed = true;
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			intersectionObserver.disconnect();
			surface.removeEventListener("pointermove", pointerMove);
			surface.removeEventListener("pointerleave", trail.leave);
			canvas.removeEventListener("webglcontextlost", onContextLost);
			document.removeEventListener("visibilitychange", refresh);
			reducedMotion.removeEventListener("change", onMotionChange);
			gl.deleteTexture(atlasTexture);
			gl.deleteTexture(sceneTexture);
			gl.deleteTexture(trailTexture);
			gl.deleteFramebuffer(framebuffer);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(sceneProgram);
			gl.deleteProgram(asciiProgram);
		},
	};
}
