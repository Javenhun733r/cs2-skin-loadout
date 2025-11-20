import { useCallback, useState } from 'react';
import * as api from '../../lib/api';
import type { Skin, SkinWithDistance } from '../../types/types';

export type SearchMode = 'premium' | 'budget';

export function useHomeLogic() {
	const [colors, setColors] = useState<string[]>(['#663399']);
	const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
	const [similarSkins, setSimilarSkins] = useState<SkinWithDistance[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchMode, setSearchMode] = useState<SearchMode>('premium');

	const handleColorChange = (index: number, newColor: string) => {
		const newColors = [...colors];
		newColors[index] = newColor;
		setColors(newColors);
	};

	const addColor = () => {
		if (colors.length < 3) {
			setColors([...colors, '#FFFFFF']);
		}
	};

	const removeColor = (index: number) => {
		if (colors.length > 1) {
			setColors(colors.filter((_, i) => i !== index));
		}
	};

	const findSimilarByColor = useCallback(
		async (targetHexes: string[]) => {
			setIsLoading(true);
			setError(null);
			setSimilarSkins([]);
			try {
				const data = await api.findSimilarSkinsByColors(
					targetHexes,
					20,
					searchMode
				);
				setSimilarSkins(data.filter(skin => skin.id !== selectedSkin?.id));
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		},
		[selectedSkin, searchMode]
	);

	const findSimilarBySkin = useCallback(
		async (skinId: string) => {
			setIsLoading(true);
			setError(null);
			setSimilarSkins([]);
			try {
				const data = await api.findSimilarSkinsBySkinId(skinId, 20, searchMode);
				setSimilarSkins(data.filter(skin => skin.id !== skinId));
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		},
		[searchMode]
	);

	const handleColorPickerSearch = () => {
		setSelectedSkin(null);
		findSimilarByColor(colors);
	};

	const handleSkinSelect = (skin: Skin) => {
		setSelectedSkin(skin);
		findSimilarBySkin(skin.id);
	};

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
		handleSkinSelect,
	};
}
