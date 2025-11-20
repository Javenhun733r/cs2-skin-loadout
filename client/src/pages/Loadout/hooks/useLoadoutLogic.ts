import { useEffect, useState } from 'react';
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
	const [allSkins, setAllSkins] = useState<SkinWithDistance[]>([]);
	const [team, setTeam] = useState<Team>('CT');

	const [categorized, setCategorized] = useState<CategorizedLoadout>({
		agent: null,
		pistols: [],
		midTier: [],
		rifles: [],
		knife: null,
		glove: null,
	});

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [modalSkin, setModalSkin] = useState<Skin | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const [colors, setColors] = useState<string[]>(() => {
		const param = searchParams.get('colors');
		if (param) {
			return param.split(',').map(c => `#${c}`);
		}
		const oldParam = searchParams.get('color');
		return oldParam ? [`#${oldParam}`] : ['#663399'];
	});

	const [mode, setMode] = useState<LoadoutMode>(
		(searchParams.get('mode') as LoadoutMode) || 'premium'
	);

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

	const handleCardClick = (skin: Skin) => {
		setModalSkin(skin);
		setIsModalOpen(true);
	};

	const filterAndCategorize = (
		skins: SkinWithDistance[],
		currentTeam: Team
	) => {
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

		skins.forEach(skin => {
			if (skin.type === 'agent') {
				if (!newLoadout.agent && skin.weapon === currentTeam) {
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
				if (weaponTeam && weaponTeam !== 'BOTH' && weaponTeam !== currentTeam) {
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
			currentTeam === 'CT' ? ['usp-s', 'p2000'] : ['glock-18'];

		const startingCandidates = availablePistols.filter(
			s => s.weapon && startingPistolNames.includes(s.weapon.toLowerCase())
		);

		const otherCandidates = availablePistols.filter(
			s => s.weapon && !startingPistolNames.includes(s.weapon.toLowerCase())
		);

		const bestStartingPistol = startingCandidates[0];

		newLoadout.pistols = [bestStartingPistol, ...otherCandidates]
			.filter(Boolean)
			.slice(0, 5);

		newLoadout.midTier = availableMidTier.slice(0, 5);
		newLoadout.rifles = availableRifles.slice(0, 5);

		setCategorized(newLoadout);
	};

	useEffect(() => {
		if (allSkins.length > 0) {
			filterAndCategorize(allSkins, team);
		}
	}, [team, allSkins]);

	useEffect(() => {
		if (colors.length === 0) return;

		const colorsParam = colors.map(c => c.replace('#', '')).join(',');
		setSearchParams({ colors: colorsParam, mode });

		const loadData = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const data = await api.fetchLoadout(colors, mode);
				setAllSkins(data);
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		};

		const timer = setTimeout(loadData, 500);
		return () => clearTimeout(timer);
	}, [colors, mode, setSearchParams]);

	return {
		colors,
		mode,
		team,
		setTeam,
		setMode,
		categorized,
		isLoading,
		error,
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
