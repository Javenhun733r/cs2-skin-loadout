import type { Skin, SkinWithDistance } from '../types/types';

const API_URL = 'http://localhost:3000';

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
