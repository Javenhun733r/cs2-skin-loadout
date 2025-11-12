export interface Skin {
	id: string;
	name: string;
	image: string;
	weapon: string | null;
	rarity: string | null;
	type: string;
	price?: { min: number; max: number } | null;

	histRed: number;
	histOrange: number;
	histYellow: number;
	histGreen: number;
	histCyan: number;
	histBlue: number;
	histPurple: number;
	histPink: number;
	histBrown: number;
	histBlack: number;
	histGray: number;
	histWhite: number;
	dominantHex: string;
}

export type SkinWithDistance = Skin & {
	distance: number;
};
