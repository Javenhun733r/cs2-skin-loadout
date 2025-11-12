export interface Skin {
	id: string;
	name: string;
	image: string;
	weapon: string | null;
	rarity: string | null;
	primaryR: number;
	primaryG: number;
	primaryB: number;
	secondaryR: number;
	secondaryG: number;
	secondaryB: number;
	accentR: number;
	accentG: number;
	accentB: number;
	price?: { min: number; max: number } | null;
}

export type SkinWithDistance = Skin & {
	distance: number;
};
