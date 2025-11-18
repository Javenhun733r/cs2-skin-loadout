import type { Skin, SkinWithDistance } from '../types/types';

const API_URL = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const errData = await response.json();
		throw new Error(errData.message || 'An API error occurred');
	}
	return response.json() as Promise<T>;
}

export async function findSimilarSkinsByColor(
	color: string,
	limit: number = 20,
	mode: 'premium' | 'budget' = 'premium'
): Promise<SkinWithDistance[]> {
	const hex = color.replace('#', '');
	const params = new URLSearchParams({
		color: hex,
		limit: String(limit),
		mode: mode,
	});

	const response = await fetch(`${API_URL}/skins/similar-to-color?${params}`);
	return handleResponse<SkinWithDistance[]>(response);
}

export async function findSimilarSkinsByColors(
	colors: string[],
	limit: number = 20,
	mode: 'premium' | 'budget' = 'premium'
): Promise<SkinWithDistance[]> {
	const hexColors = colors.map(c => c.replace('#', '')).join(',');

	const params = new URLSearchParams({
		colors: hexColors,
		limit: String(limit),
		mode: mode,
	});

	const response = await fetch(`${API_URL}/skins/similar-by-colors?${params}`);
	return handleResponse<SkinWithDistance[]>(response);
}

export async function findSimilarSkinsBySkinId(
	skinId: string,
	limit: number = 20,
	mode: 'premium' | 'budget' = 'premium'
): Promise<SkinWithDistance[]> {
	const params = new URLSearchParams({
		limit: String(limit),
		mode: mode,
	});
	const response = await fetch(
		`${API_URL}/skins/similar-to-skin/${skinId}?${params}`
	);
	return handleResponse<SkinWithDistance[]>(response);
}

export async function fetchLoadout(
	color: string,
	mode: 'premium' | 'budget' = 'premium'
): Promise<SkinWithDistance[]> {
	const hex = color.replace('#', '');

	const params = new URLSearchParams({ color: hex, mode: mode });

	const response = await fetch(`${API_URL}/skins/loadout?${params}`);
	return handleResponse<SkinWithDistance[]>(response);
}

export async function searchSkinsByName(query: string): Promise<Skin[]> {
	if (query.trim() === '') return [];

	const params = new URLSearchParams({ q: query });
	const response = await fetch(`${API_URL}/skins/search?${params}`);
	return handleResponse<Skin[]>(response);
}
