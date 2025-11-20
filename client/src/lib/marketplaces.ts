export interface MarketLink {
	name: string;
	url: string;
	icon?: string;
	color: string;
}

export function getMarketplaceLinks(skinName: string): MarketLink[] {
	const encodedName = encodeURIComponent(skinName);

	const whiteMarketQuery = skinName
		.replace(/★/g, '')
		.replace(/\|/g, '')
		.replace(/™/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	const encodedWhiteMarketQuery = encodeURIComponent(whiteMarketQuery);

	return [
		{
			name: 'Steam',
			url: `https://steamcommunity.com/market/search?appid=730&q=${encodedName}`,
			color: '#171a21',
		},
		{
			name: 'Skinport',
			url: `https://skinport.com/market?search=${encodedName}`,
			color: '#fa490a',
		},
		{
			name: 'DMarket',
			url: `https://dmarket.com/ingame-items/item-list/csgo-skins?title=${encodedName}`,
			color: '#4fce16',
		},
		{
			name: 'White.Market',
			url: `https://white.market/market?name=${encodedWhiteMarketQuery}`,
			color: '#111111',
		},
	];
}
