"use client";

import { useEffect, useRef } from "react";
import { createAsciiSky } from "@/lib/ascii-sky";

export default function MoneySky() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const surface = canvas?.closest(".landing-hero");
		if (!(canvas && surface instanceof HTMLElement)) {
			return;
		}
		const controller = createAsciiSky(canvas, surface);
		return () => {
			controller.destroy();
		};
	}, []);

	return (
		<div aria-hidden="true" className="ascii-sky">
			<canvas className="ascii-sky-canvas" ref={canvasRef} tabIndex={-1} />
		</div>
	);
}
