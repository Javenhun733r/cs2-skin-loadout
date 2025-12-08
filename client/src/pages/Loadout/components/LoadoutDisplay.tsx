import { SkinCard } from '../../../components/skin-card/SkinCard';
import type { Skin } from '../../../types/types';
import type { CategorizedLoadout } from '../hooks/useLoadoutLogic';

interface LoadoutDisplayProps {
	loadout: CategorizedLoadout;
	onCardClick: (skin: Skin) => void;
	lockedIds?: string[];
	onToggleLock?: (skin: Skin) => void;
}

function WeaponColumn({
	title,
	skins,
	onCardClick,
	lockedIds,
	onToggleLock,
}: {
	title: string;
	skins: Skin[];
	onCardClick: (skin: Skin) => void;
	lockedIds?: string[];
	onToggleLock?: (skin: Skin) => void;
}) {
	return (
		<div className='WeaponColumn'>
			<div className='CategoryHeader'>{title}</div>
			<div className='SlotList'>
				{[...Array(5)].map((_, i) => {
					const skin = skins[i];
					return skin ? (
						<SkinCard
							key={skin.id}
							skin={skin}
							onClick={onCardClick}
							isLocked={lockedIds?.includes(skin.id)}
							onToggleLock={onToggleLock}
						/>
					) : (
						<div key={`empty-${title}-${i}`} className='EmptySlot'>
							Empty Slot
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function LoadoutDisplay({
	loadout,
	onCardClick,
	lockedIds,
	onToggleLock,
}: LoadoutDisplayProps) {
	return (
		<div className='WeaponsSection'>
			<WeaponColumn
				title='Starting Pistol'
				skins={loadout.pistols}
				onCardClick={onCardClick}
				lockedIds={lockedIds}
				onToggleLock={onToggleLock}
			/>
			<WeaponColumn
				title='Mid-Tier'
				skins={loadout.midTier}
				onCardClick={onCardClick}
				lockedIds={lockedIds}
				onToggleLock={onToggleLock}
			/>
			<WeaponColumn
				title='Rifles'
				skins={loadout.rifles}
				onCardClick={onCardClick}
				lockedIds={lockedIds}
				onToggleLock={onToggleLock}
			/>
		</div>
	);
}
