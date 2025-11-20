import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce';
import * as api from '../../../lib/api';
import { HISTOGRAM_COLOR_MAP } from '../../../lib/constants';
import type { Skin, SkinWithDistance } from '../../../types/types';

export type SearchMode = 'premium' | 'budget';

export function useHomeLogic() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const [colors, setColors] = useState<string[]>(() => {
		const c = searchParams.get('colors');
		return c ? c.split(',').map(hex => `#${hex}`) : ['#663399'];
	});

	const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
	const [similarSkins, setSimilarSkins] = useState<SkinWithDistance[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchMode, setSearchMode] = useState<SearchMode>('premium');
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);

	const [suggestionQuery, setSuggestionQuery] = useState('');
	const [suggestions, setSuggestions] = useState<Skin[]>([]);
	const debouncedSuggestionQuery = useDebounce(suggestionQuery, 300);

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
		const currentColors = searchParams.get('colors');
		const currentMode = searchParams.get('mode') || 'premium';

		if (currentColors === colorsParam && currentMode === searchMode) return;

		setSearchParams({ colors: colorsParam, mode: searchMode });
		setPage(1);
		setSimilarSkins([]);
		setSelectedSkin(null);
	};

	const handleTextSearch = (query: string) => {
		if (!query.trim()) return;
		const currentName = searchParams.get('name');
		if (currentName === query) return;

		setSearchParams({ name: query });
		setPage(1);
		setSimilarSkins([]);
		setSelectedSkin(null);
	};

	const loadMore = () => {
		setPage(prev => prev + 1);
	};

	const findSimilarBySkin = useCallback(
		async (skinId: string, currentPage: number) => {
			setIsLoading(true);
			setError(null);
			try {
				const data = await api.findSimilarSkinsBySkinId(
					skinId,
					20,
					searchMode,
					currentPage
				);

				if (data.length === 0) {
					setHasMore(false);
				} else {
					setHasMore(true);
					setSimilarSkins(prev =>
						currentPage === 1
							? data.filter(s => s.id !== skinId)
							: [...prev, ...data.filter(s => s.id !== skinId)]
					);
				}
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		},
		[searchMode]
	);

	const handleSkinSelect = (skin: Skin) => {
		setSelectedSkin(skin);
		setSuggestions([]);
		setSuggestionQuery('');

		setSearchParams({ skinId: skin.id });
		setPage(1);
		setSimilarSkins([]);
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

	useEffect(() => {
		const fetchSuggestions = async () => {
			if (!debouncedSuggestionQuery.trim()) {
				setSuggestions([]);
				return;
			}
			try {
				const results = await api.searchSkinsByName(debouncedSuggestionQuery);
				setSuggestions(results);
			} catch (err) {
				console.error('Failed to fetch suggestions', err);
			}
		};
		fetchSuggestions();
	}, [debouncedSuggestionQuery]);

	useEffect(() => {
		const nameQuery = searchParams.get('name');
		const colorsQuery = searchParams.get('colors');
		const skinIdQuery = searchParams.get('skinId');
		const modeQuery = (searchParams.get('mode') as SearchMode) || 'premium';

		if (!nameQuery && !colorsQuery && !skinIdQuery) return;

		if (skinIdQuery) {
			findSimilarBySkin(skinIdQuery, page);
			return;
		}

		const fetchData = async () => {
			setIsLoading(true);
			setError(null);
			try {
				let newData: SkinWithDistance[] = [];

				if (nameQuery) {
					const results = await api.searchSkinsByName(nameQuery, page);
					newData = results.map(s => ({ ...s, distance: 0 }));
				} else if (colorsQuery) {
					const colorArray = colorsQuery.split(',');
					newData = await api.findSimilarSkinsByColors(
						colorArray,
						20,
						modeQuery,
						page
					);
				}

				if (newData.length === 0) {
					setHasMore(false);
				} else {
					setHasMore(true);
					setSimilarSkins(prev =>
						page === 1 ? newData : [...prev, ...newData]
					);
				}
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [searchParams, page, findSimilarBySkin]);

	return {
		colors,
		selectedSkin,
		similarSkins,
		isLoading,
		error,
		searchMode,
		setSearchMode,
		handleColorChange,
		addColor,
		removeColor,
		handleColorPickerSearch,
		handleTextSearch,
		handleSkinSelect,
		handleFindLoadout,
		loadMore,
		hasMore,
		suggestionQuery,
		setSuggestionQuery,
		suggestions,
	};
}
