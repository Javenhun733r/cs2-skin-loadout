import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../../../lib/api';
import { WEAPON_CATEGORIES, WEAPON_TEAMS } from '../../../lib/constants';
import type { Skin, SkinWithDistance } from '../../../types/types';

export type LoadoutMode = 'premium' | 'budget';
export type Team = 'CT' | 'T';

export interface CategorizedLoadout {
	agent: SkinWithDistance | null;
	pistols: SkinWithDistance[];
	midTier: SkinWithDistance[];
	rifles: SkinWithDistance[];
	knife: SkinWithDistance | null;
	glove: SkinWithDistance | null;
}

export function useLoadoutLogic() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [team, setTeam] = useState<Team>('CT');

	const [modalSkin, setModalSkin] = useState<Skin | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const colorsParam = searchParams.get('colors');
	const modeParam = (searchParams.get('mode') as LoadoutMode) || 'premium';

	const [colors, setColors] = useState<string[]>(() => {
		if (colorsParam) {
			return colorsParam.split(',').map(c => `#${c}`);
		}
		const oldParam = searchParams.get('color');
		return oldParam ? [`#${oldParam}`] : ['#663399'];
	});

	const [mode, setModeState] = useState<LoadoutMode>(modeParam);

	const updateParams = (newColors: string[], newMode: LoadoutMode) => {
		const param = newColors.map(c => c.replace('#', '')).join(',');
		setSearchParams({ colors: param, mode: newMode });
	};

	const {
		data: allSkins = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ['loadout', { colors: colorsParam, mode: modeParam }],
		queryFn: () => {
			if (!colorsParam) return [];
			return api.fetchLoadout(colorsParam.split(','), modeParam);
		},
		enabled: !!colorsParam,
		staleTime: 1000 * 60 * 5,
	});

	const categorized = useMemo(() => {
		const newLoadout: CategorizedLoadout = {
			agent: null,
			pistols: [],
			midTier: [],
			rifles: [],
			knife: null,
			glove: null,
		};

		const availablePistols: SkinWithDistance[] = [];
		const availableMidTier: SkinWithDistance[] = [];
		const availableRifles: SkinWithDistance[] = [];

		allSkins.forEach(skin => {
			if (skin.type === 'agent') {
				if (!newLoadout.agent && skin.weapon === team) {
					newLoadout.agent = skin;
				}
				return;
			}
			if (skin.type === 'knife') {
				if (!newLoadout.knife) newLoadout.knife = skin;
				return;
			}
			if (skin.type === 'glove') {
				if (!newLoadout.glove) newLoadout.glove = skin;
				return;
			}

			if (skin.weapon) {
				const weaponName = skin.weapon.toLowerCase();
				const weaponTeam = WEAPON_TEAMS[weaponName];

				if (weaponTeam && weaponTeam !== 'BOTH' && weaponTeam !== team) {
					return;
				}

				if (WEAPON_CATEGORIES.pistols.includes(weaponName)) {
					availablePistols.push(skin);
				} else if (WEAPON_CATEGORIES.midTier.includes(weaponName)) {
					availableMidTier.push(skin);
				} else if (WEAPON_CATEGORIES.rifles.includes(weaponName)) {
					availableRifles.push(skin);
				}
			}
		});

		const startingPistolNames =
			team === 'CT' ? ['usp-s', 'p2000'] : ['glock-18'];
		const startingCandidates = availablePistols.filter(
			s => s.weapon && startingPistolNames.includes(s.weapon.toLowerCase())
		);
		const otherCandidates = availablePistols.filter(
			s => s.weapon && !startingPistolNames.includes(s.weapon.toLowerCase())
		);

		newLoadout.pistols = [startingCandidates[0], ...otherCandidates]
			.filter(Boolean)
			.slice(0, 5);
		newLoadout.midTier = availableMidTier.slice(0, 5);
		newLoadout.rifles = availableRifles.slice(0, 5);

		return newLoadout;
	}, [allSkins, team]);

	const setMode = (newMode: LoadoutMode) => {
		setModeState(newMode);
		updateParams(colors, newMode);
	};

	const handleColorChange = (index: number, newColor: string) => {
		const newColors = [...colors];
		newColors[index] = newColor;
		setColors(newColors);
		updateParams(newColors, mode);
	};

	const addColor = () => {
		if (colors.length < 3) {
			const newColors = [...colors, '#FFFFFF'];
			setColors(newColors);
			updateParams(newColors, mode);
		}
	};

	const removeColor = (index: number) => {
		if (colors.length > 1) {
			const newColors = colors.filter((_, i) => i !== index);
			setColors(newColors);
			updateParams(newColors, mode);
		}
	};

	const handleCardClick = (skin: Skin) => {
		setModalSkin(skin);
		setIsModalOpen(true);
	};

	return {
		colors,
		mode,
		team,
		setTeam,
		setMode,
		categorized,
		isLoading,
		error: error ? (error as Error).message : null,
		modalSkin,
		isModalOpen,
		setModalSkin,
		setIsModalOpen,
		handleColorChange,
		addColor,
		removeColor,
		handleCardClick,
	};
}
