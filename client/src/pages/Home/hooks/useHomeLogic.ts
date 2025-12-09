import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce';
import * as api from '../../../lib/api';
import { HISTOGRAM_COLOR_MAP } from '../../../lib/constants';
import type { Skin } from '../../../types/types';
export type SearchMode = 'premium' | 'budget';

export function useHomeLogic() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const steamIdQuery = searchParams.get('steamId');
	const nameQuery = searchParams.get('name');
	const colorsQuery = searchParams.get('colors');
	const skinIdQuery = searchParams.get('skinId');
	const modeQuery = (searchParams.get('mode') as SearchMode) || 'premium';
	const [inventorySkins, setInventorySkins] = useState<Skin[]>([]);
	const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
	const [visibleInventoryCount, setVisibleInventoryCount] = useState(10);
	const [colors, setColors] = useState<string[]>(() => {
		const c = searchParams.get('colors');
		return c ? c.split(',').map(hex => `#${hex}`) : ['#663399'];
	});
	const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
	const [searchMode, setSearchMode] = useState<SearchMode>(modeQuery);
	const [suggestionQuery, setSuggestionQuery] = useState('');

	const debouncedSuggestionQuery = useDebounce(suggestionQuery, 300);
	useEffect(() => {
		if (!searchParams.get('skinId') && !searchParams.get('steamId')) {
			setSelectedSkin(null);
		}
	}, [searchParams]);
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
		queryKey: [
			'skins',
			{ nameQuery, colorsQuery, skinIdQuery, steamIdQuery, modeQuery },
		],
		queryFn: async ({ pageParam = 1 }) => {
			if (steamIdQuery) {
				if (pageParam > 1) return [];
				const results = await api.getSteamInventory(steamIdQuery);

				return results.map(s => ({ ...s, distance: 0 }));
			} else if (skinIdQuery) {
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
			if (steamIdQuery) return undefined;
			return lastPage.length === 20 ? allPages.length + 1 : undefined;
		},

		enabled: !!(nameQuery || colorsQuery || skinIdQuery || steamIdQuery),
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
	const { mutate: fetchInventory, isPending: isInventoryLoading } = useMutation(
		{
			mutationFn: (steamId: string) => api.getSteamInventory(steamId),
			onSuccess: skins => {
				if (skins.length === 0) {
					alert('No matching skins found in public inventory.');
				} else {
					setInventorySkins(skins);
					setVisibleInventoryCount(50);
					setIsInventoryModalOpen(true);
				}
			},
			onError: err => {
				console.error(err);
				alert(`Error: ${(err as Error).message}`);
			},
		}
	);

	const handleImportInventory = useCallback(() => {
		const steamInput = prompt(
			'Enter your Steam ID, Custom URL, or Profile Link:'
		);
		if (steamInput) {
			fetchInventory(steamInput);
		}
	}, [fetchInventory]);

	const handleLoadMoreInventory = () => {
		setVisibleInventoryCount(prev => prev + 50);
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
		isInventoryLoading,
		handleImportInventory,
		inventorySkins,
		isInventoryModalOpen,
		setIsInventoryModalOpen,
		visibleInventoryCount,
		handleLoadMoreInventory,
	};
}
