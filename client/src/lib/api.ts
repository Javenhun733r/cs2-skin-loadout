import type { Skin, SkinWithDistance } from '../types/types';

const API_URL = 'http://localhost:3000';

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const errData = await response.json();
		throw new Error(errData.message || 'An API error occurred');
	}
	return response.json() as Promise<T>;
}

export async function findSimilarSkins(
	color: string,
	limit: number = 20
): Promise<SkinWithDistance[]> {
	const hex = color.replace('#', '');
	const params = new URLSearchParams({ color: hex, limit: String(limit) });

	const response = await fetch(`${API_URL}/skins/similar-to?${params}`);
	return handleResponse<SkinWithDistance[]>(response);
}

export async function fetchLoadout(color: string): Promise<SkinWithDistance[]> {
	const hex = color.replace('#', '');
	const params = new URLSearchParams({ color: hex });

	const response = await fetch(`${API_URL}/skins/loadout?${params}`);
	return handleResponse<SkinWithDistance[]>(response);
}

export async function searchSkinsByName(query: string): Promise<Skin[]> {
	if (query.trim() === '') return [];

	const params = new URLSearchParams({ q: query });
	const response = await fetch(`${API_URL}/skins/search?${params}`);
	return handleResponse<Skin[]>(response);
}
