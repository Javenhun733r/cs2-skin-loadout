import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce';
import * as api from '../../../lib/api';
import { HISTOGRAM_COLOR_MAP } from '../../../lib/constants';
import type { Skin } from '../../../types/types';

export type SearchMode = 'premium' | 'budget';

export function useHomeLogic() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const nameQuery = searchParams.get('name');
	const colorsQuery = searchParams.get('colors');
	const skinIdQuery = searchParams.get('skinId');
	const modeQuery = (searchParams.get('mode') as SearchMode) || 'premium';

	const [colors, setColors] = useState<string[]>(() => {
		const c = searchParams.get('colors');
		return c ? c.split(',').map(hex => `#${hex}`) : ['#663399'];
	});
	const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
	const [searchMode, setSearchMode] = useState<SearchMode>(modeQuery);
	const [suggestionQuery, setSuggestionQuery] = useState('');

	const debouncedSuggestionQuery = useDebounce(suggestionQuery, 300);

	const { data: suggestions = [] } = useQuery({
		queryKey: ['searchSuggestions', debouncedSuggestionQuery],
		queryFn: () => api.searchSkinsByName(debouncedSuggestionQuery),
		enabled: debouncedSuggestionQuery.trim().length > 0,
		staleTime: 1000 * 60,
	});

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		error,
	} = useInfiniteQuery({
		queryKey: ['skins', { nameQuery, colorsQuery, skinIdQuery, modeQuery }],
		queryFn: async ({ pageParam = 1 }) => {
			if (skinIdQuery) {
				return api.findSimilarSkinsBySkinId(
					skinIdQuery,
					20,
					modeQuery,
					pageParam
				);
			} else if (nameQuery) {
				const results = await api.searchSkinsByName(nameQuery, pageParam);

				return results.map(s => ({ ...s, distance: 0 }));
			} else if (colorsQuery) {
				const colorArray = colorsQuery.split(',');
				return api.findSimilarSkinsByColors(
					colorArray,
					20,
					modeQuery,
					pageParam
				);
			}
			return [];
		},
		getNextPageParam: (lastPage, allPages) => {
			return lastPage.length === 20 ? allPages.length + 1 : undefined;
		},
		enabled: !!(nameQuery || colorsQuery || skinIdQuery),
		initialPageParam: 1,
	});

	const similarSkins = data?.pages.flat() || [];

	const handleColorChange = (index: number, newColor: string) => {
		const newColors = [...colors];
		newColors[index] = newColor;
		setColors(newColors);
	};

	const addColor = () => {
		if (colors.length < 3) setColors([...colors, '#FFFFFF']);
	};

	const removeColor = (index: number) => {
		if (colors.length > 1) setColors(colors.filter((_, i) => i !== index));
	};

	const handleColorPickerSearch = () => {
		const colorsParam = colors.map(c => c.replace('#', '')).join(',');

		setSelectedSkin(null);
		setSearchParams({ colors: colorsParam, mode: searchMode });
	};

	const handleTextSearch = (query: string) => {
		if (!query.trim()) return;
		setSelectedSkin(null);
		setSearchParams({ name: query });
	};

	const handleSkinSelect = (skin: Skin) => {
		setSelectedSkin(skin);
		setSuggestionQuery('');
		setSearchParams({ skinId: skin.id, mode: searchMode });
	};

	const handleFindLoadout = useCallback(() => {
		let targetColors: string[] = [];

		if (selectedSkin) {
			const histogramEntries = Object.entries(selectedSkin).filter(
				([key]) => key.startsWith('hist') && HISTOGRAM_COLOR_MAP[key]
			);
			const sortedColors = histogramEntries.sort(
				(a, b) => (b[1] as number) - (a[1] as number)
			);
			targetColors = sortedColors
				.slice(0, 3)
				.filter(([, value]) => (value as number) > 0.1)
				.map(([key]) => HISTOGRAM_COLOR_MAP[key]);

			if (targetColors.length === 0) {
				targetColors = [selectedSkin.dominantHex];
			}
			if (!targetColors.includes(selectedSkin.dominantHex)) {
				targetColors.unshift(selectedSkin.dominantHex);
				targetColors = targetColors.slice(0, 3);
			}
		} else {
			targetColors = colors;
		}

		const colorsParam = targetColors.map(c => c.replace('#', '')).join(',');
		navigate(`/loadout?colors=${colorsParam}&mode=${searchMode}`);
	}, [selectedSkin, colors, searchMode, navigate]);

	return {
		colors,
		selectedSkin,
		similarSkins,
		isLoading,
		isFetchingNextPage,

		error: error ? (error as Error).message : null,
		searchMode,
		setSearchMode,
		handleColorChange,
		addColor,
		removeColor,
		handleColorPickerSearch,
		handleTextSearch,
		handleSkinSelect,
		handleFindLoadout,
		loadMore: fetchNextPage,
		hasMore: hasNextPage,
		suggestionQuery,
		setSuggestionQuery,
		suggestions,
	};
}
