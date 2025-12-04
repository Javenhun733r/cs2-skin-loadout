export const HISTOGRAM_COLOR_MAP: Record<string, string> = {
	histBlack: '#202020',
	histGray: '#808080',
	histWhite: '#f5f5f5',
	histBrown: '#8b4513',

	histRed: '#ff4500',

	histVermilion: '#e34234',

	histOrange: '#ffa500',

	histAmber: '#ffbf00',

	histYellow: '#ffd700',

	histLime: '#c0ff00',

	histGreen: '#32cd32',

	histMint: '#00fa9a',

	histTeal: '#008080',

	histCyan: '#00ced1',

	histSkyBlue: '#87ceeb',

	histBlue: '#1e90ff',

	histIndigo: '#4b0082',

	histViolet: '#8a2be2',

	histPurple: '#800080',

	histMagenta: '#ff00ff',

	histFuchsia: '#ff1493',

	histRose: '#ff007f',
};

export const WEAPON_TEAMS: Record<string, 'CT' | 'T' | 'BOTH'> = {
	'glock-18': 'T',
	'usp-s': 'CT',
	p2000: 'CT',
	p250: 'BOTH',
	'five-seven': 'CT',
	'tec-9': 'T',
	'cz75-auto': 'BOTH',
	'dual berettas': 'BOTH',
	'desert eagle': 'BOTH',
	'r8 revolver': 'BOTH',

	'mac-10': 'T',
	mp9: 'CT',
	mp7: 'BOTH',
	'mp5-sd': 'BOTH',
	'ump-45': 'BOTH',
	p90: 'BOTH',
	'pp-bizon': 'BOTH',
	nova: 'BOTH',
	xm1014: 'BOTH',
	'mag-7': 'CT',
	'sawed-off': 'T',
	negev: 'BOTH',
	m249: 'BOTH',

	'galil ar': 'T',
	famas: 'CT',
	'ak-47': 'T',
	m4a4: 'CT',
	'm4a1-s': 'CT',
	'ssg 08': 'BOTH',
	'sg 553': 'T',
	aug: 'CT',
	awp: 'BOTH',
	g3sg1: 'T',
	'scar-20': 'CT',
};

export const WEAPON_CATEGORIES = {
	pistols: [
		'glock-18',
		'usp-s',
		'p2000',
		'p250',
		'five-seven',
		'tec-9',
		'cz75-auto',
		'dual berettas',
		'desert eagle',
		'r8 revolver',
	],
	midTier: [
		'mac-10',
		'mp9',
		'mp7',
		'mp5-sd',
		'ump-45',
		'p90',
		'pp-bizon',
		'nova',
		'xm1014',
		'mag-7',
		'sawed-off',
		'negev',
		'm249',
	],
	rifles: [
		'galil ar',
		'famas',
		'ak-47',
		'm4a4',
		'm4a1-s',
		'ssg 08',
		'sg 553',
		'aug',
		'awp',
		'g3sg1',
		'scar-20',
	],
};
