import {
	RiApps2Line,
	RiFilmLine,
	RiFlightTakeoffLine,
	RiHotelBedLine,
	RiPriceTag3Line,
	RiRestaurant2Line,
} from "@remixicon/react";

const categoryIcons = {
	custom: RiPriceTag3Line,
	entertainment: RiFilmLine,
	food: RiRestaurant2Line,
	hotel: RiHotelBedLine,
	other: RiApps2Line,
	travel: RiFlightTakeoffLine,
};

export type CategoryIconName = keyof typeof categoryIcons;

export function ExpenseCategoryIcon({
	icon,
	className,
}: {
	icon: CategoryIconName;
	className?: string;
}) {
	const Icon = categoryIcons[icon];
	return <Icon aria-hidden="true" className={className} />;
}
