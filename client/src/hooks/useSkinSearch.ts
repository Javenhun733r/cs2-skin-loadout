import { useEffect, useState } from 'react';
import * as api from '../lib/api';
import type { Skin } from '../types/types';
import { useDebounce } from './useDebounce';

export function useSkinSearch(delay: number = 300) {
	const [searchQuery, setSearchQuery] = useState('');

	const [searchResults, setSearchResults] = useState<Skin[]>([]);

	const [isLoading, setIsLoading] = useState(false);

	const [error, setError] = useState<string | null>(null);

	const debouncedSearchQuery = useDebounce(searchQuery, delay);

	useEffect(() => {
		const searchByName = async () => {
			if (debouncedSearchQuery.trim() === '') {
				setSearchResults([]);
				setIsLoading(false);
				setError(null);
				return;
			}

			setIsLoading(true);
			setError(null);
			try {
				const data = await api.searchSkinsByName(debouncedSearchQuery);
				setSearchResults(data);
			} catch (err) {
				const errorMessage =
					(err as Error).message || 'Failed to search for skins';
				console.error(err);
				setError(errorMessage);
			} finally {
				setIsLoading(false);
			}
		};

		searchByName();
	}, [debouncedSearchQuery]);

	const clearSearch = () => {
		setSearchQuery('');
		setSearchResults([]);
		setError(null);
	};

	return {
		searchQuery,
		setSearchQuery,
		searchResults,
		isLoading,
		error,
		clearSearch,
	};
}
