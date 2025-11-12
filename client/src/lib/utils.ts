export function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
