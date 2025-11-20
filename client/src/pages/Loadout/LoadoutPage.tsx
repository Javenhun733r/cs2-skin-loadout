import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
import { Alert } from '../../components/ui/alert/Alert';
import { SkinMarketModal } from '../../components/ui/modals/SkinMarketModal';
import { Spinner } from '../../components/ui/spinner/Spinner';
import * as api from '../../lib/api';
import type { Skin, SkinWithDistance } from '../../types/types';
import './LoadoutPage.css';

type LoadoutMode = 'premium' | 'budget';

const WEAPON_CATEGORIES = {
	pistols: [
		'glock-18',
		'usp-s',
		'p2000',
		'p250',
		'five-seven',
		'tec-9',
		'cz75-auto',
		'dual berettas',
		'desert eagle',
		'r8 revolver',
	],
	midTier: [
		'mac-10',
		'mp9',
		'mp7',
		'mp5-sd',
		'ump-45',
		'p90',
		'pp-bizon',
		'nova',
		'xm1014',
		'mag-7',
		'sawed-off',
		'negev',
		'm249',
	],
	rifles: [
		'galil ar',
		'famas',
		'ak-47',
		'm4a4',
		'm4a1-s',
		'ssg 08',
		'sg 553',
		'aug',
		'awp',
		'g3sg1',
		'scar-20',
	],
};

interface CategorizedLoadout {
	pistols: SkinWithDistance[];
	midTier: SkinWithDistance[];
	rifles: SkinWithDistance[];
	knife: SkinWithDistance | null;
	glove: SkinWithDistance | null;
}

export default function LoadoutPage() {
	const [categorized, setCategorized] = useState<CategorizedLoadout>({
		pistols: [],
		midTier: [],
		rifles: [],
		knife: null,
		glove: null,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();

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

	useEffect(() => {
		if (colors.length === 0) return;

		const colorsParam = colors.map(c => c.replace('#', '')).join(',');
		setSearchParams({ colors: colorsParam, mode });

		const loadData = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const data = await api.fetchLoadout(colors, mode);
				processLoadoutData(data);
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		};

		const timer = setTimeout(loadData, 500);
		return () => clearTimeout(timer);
	}, [colors, mode, setSearchParams]);

	const processLoadoutData = (skins: SkinWithDistance[]) => {
		const newLoadout: CategorizedLoadout = {
			pistols: [],
			midTier: [],
			rifles: [],
			knife: null,
			glove: null,
		};

		skins.forEach(skin => {
			if (skin.type === 'knife') {
				if (!newLoadout.knife) newLoadout.knife = skin;
			} else if (skin.type === 'glove') {
				if (!newLoadout.glove) newLoadout.glove = skin;
			} else if (skin.weapon) {
				const weaponName = skin.weapon.toLowerCase();

				if (WEAPON_CATEGORIES.pistols.includes(weaponName)) {
					newLoadout.pistols.push(skin);
				} else if (WEAPON_CATEGORIES.midTier.includes(weaponName)) {
					newLoadout.midTier.push(skin);
				} else if (WEAPON_CATEGORIES.rifles.includes(weaponName)) {
					newLoadout.rifles.push(skin);
				}
			}
		});

		newLoadout.pistols = newLoadout.pistols.slice(0, 5);
		newLoadout.midTier = newLoadout.midTier.slice(0, 5);
		newLoadout.rifles = newLoadout.rifles.slice(0, 5);

		setCategorized(newLoadout);
	};

	const hasItems =
		categorized.pistols.length > 0 ||
		categorized.midTier.length > 0 ||
		categorized.rifles.length > 0 ||
		categorized.knife ||
		categorized.glove;

	return (
		<section className='LoadoutPage'>
			<div className='LoadoutHeader'>
				<Link to='/' className='BackLink'>
					&larr; Back to Search
				</Link>
				<h2>CS2 Loadout Builder</h2>
				<div className='HeaderControls'>
					<div
						className='ColorsContainer'
						style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
					>
						{colors.map((color, index) => (
							<div
								key={index}
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '2px',
								}}
							>
								<input
									type='color'
									className='ColorPicker'
									value={color}
									onChange={e => handleColorChange(index, e.target.value)}
								/>
								{colors.length > 1 && (
									<button
										onClick={() => removeColor(index)}
										style={{
											fontSize: '10px',
											border: 'none',
											background: 'transparent',
											color: 'var(--color-error-text)',
											cursor: 'pointer',
										}}
									>
										✕
									</button>
								)}
							</div>
						))}

						{colors.length < 3 && (
							<button
								onClick={addColor}
								className='AddColorBtn'
								style={{
									width: '30px',
									height: '30px',
									borderRadius: '50%',
									border: '1px dashed var(--color-border)',
									background: 'transparent',
									cursor: 'pointer',
									color: 'var(--color-text-secondary)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: '20px',
								}}
							>
								+
							</button>
						)}
					</div>
					<div className='ModeToggleCompact'>
						<button
							className={`ModeButton ${mode === 'premium' ? 'active' : ''}`}
							onClick={() => setMode('premium')}
						>
							Best Match
						</button>
						<button
							className={`ModeButton ${mode === 'budget' ? 'active' : ''}`}
							onClick={() => setMode('budget')}
						>
							Budget
						</button>
					</div>
				</div>
			</div>

			{isLoading && <Spinner />}
			{error && <Alert type='error'>{error}</Alert>}

			{!isLoading && !hasItems && !error && (
				<Alert type='info'>
					No matching skins found for this color. Try choosing a more common
					color or switching modes.
				</Alert>
			)}

			{!isLoading && hasItems && (
				<div className='CS2Container'>
					<div className='EquipmentRow'>
						<div className='EquipmentSlot'>
							<h4>Agent & Equipment</h4>
							<div className='EquipmentGrid'>
								{categorized.knife ? (
									<SkinCard
										skin={categorized.knife}
										onClick={handleCardClick}
									/>
								) : (
									<div className='EmptySlot'>No Knife</div>
								)}
								{categorized.glove ? (
									<SkinCard
										skin={categorized.glove}
										onClick={handleCardClick}
									/>
								) : (
									<div className='EmptySlot'>No Gloves</div>
								)}
							</div>
						</div>
					</div>

					<div className='WeaponsLayout'>
						<div className='WeaponColumn'>
							<h3>Pistols</h3>
							<div className='SlotList'>
								{categorized.pistols.map(skin => (
									<SkinCard
										key={skin.id}
										skin={skin}
										onClick={handleCardClick}
									/>
								))}
								{[...Array(5 - categorized.pistols.length)].map((_, i) => (
									<div key={`empty-p-${i}`} className='EmptySlot'>
										Empty Slot
									</div>
								))}
							</div>
						</div>

						<div className='WeaponColumn'>
							<h3>Mid-Tier</h3>
							<div className='SlotList'>
								{categorized.midTier.map(skin => (
									<SkinCard
										key={skin.id}
										skin={skin}
										onClick={handleCardClick}
									/>
								))}
								{[...Array(5 - categorized.midTier.length)].map((_, i) => (
									<div key={`empty-m-${i}`} className='EmptySlot'>
										Empty Slot
									</div>
								))}
							</div>
						</div>

						<div className='WeaponColumn'>
							<h3>Rifles</h3>
							<div className='SlotList'>
								{categorized.rifles.map(skin => (
									<SkinCard
										key={skin.id}
										skin={skin}
										onClick={handleCardClick}
									/>
								))}
								{[...Array(5 - categorized.rifles.length)].map((_, i) => (
									<div key={`empty-r-${i}`} className='EmptySlot'>
										Empty Slot
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			<SkinMarketModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				skin={modalSkin}
			/>
		</section>
	);
}
