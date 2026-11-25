import { Avatar } from "@blobz/react";

const palette = ["#ecfdf5", "#34d399"] as const;

export function PersonAvatar({ id }: { id: string }) {
	return (
		<span aria-hidden="true" className="feature-dither inline-flex shrink-0 rounded-full p-0.5">
			<Avatar alt="" className="block size-6" frame="circle" name={id} palette={palette} size={24} />
		</span>
	);
}
