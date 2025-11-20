export function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
export function getRarityColor(rarity: string | null): string {
	if (!rarity) return '#b0c3d9';

	const lowerRarity = rarity.toLowerCase();

	switch (lowerRarity) {
		case 'consumer grade':
			return '#b0c3d9';
		case 'mil-spec grade':
		case 'mil-spec':
			return '#4b69ff';
		case 'restricted':
			return '#8847ff';
		case 'classified':
			return '#d32ce6';
		case 'covert':
			return '#eb4b4b';
		case 'extraordinary':
		case 'contraband':
			return '#ffd700';
		default:
			return '#b0c3d9';
	}
}
export function formatPrice(
	priceData: { min: number; max: number } | null | undefined
): string | null {
	if (!priceData) {
		return null;
	}

	const { min, max } = priceData;

	const format = (cents: number) => {
		const dollars = cents / 100;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(dollars);
	};

	const minFormatted = format(min);

	if (min === max || max === 0) {
		return minFormatted;
	}

	const maxFormatted = format(max);
	return `${minFormatted} - ${maxFormatted}`;
}
