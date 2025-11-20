import { SkinCard } from '../../../components/skin-card/SkinCard';
import type { Skin } from '../../../types/types';
import type { CategorizedLoadout } from '../hooks/useLoadoutLogic';

interface LoadoutDisplayProps {
	loadout: CategorizedLoadout;
	onCardClick: (skin: Skin) => void;
}

function WeaponColumn({
	title,
	skins,
	onCardClick,
}: {
	title: string;
	skins: Skin[];
	onCardClick: (skin: Skin) => void;
}) {
	return (
		<div className='WeaponColumn'>
			<div className='CategoryHeader'>{title}</div>
			<div className='SlotList'>
				{}
				{[...Array(5)].map((_, i) => {
					const skin = skins[i];
					return skin ? (
						<SkinCard key={skin.id} skin={skin} onClick={onCardClick} />
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

export function LoadoutDisplay({ loadout, onCardClick }: LoadoutDisplayProps) {
	return (
		<div className='WeaponsSection'>
			<WeaponColumn
				title='Starting Pistol'
				skins={loadout.pistols}
				onCardClick={onCardClick}
			/>
			<WeaponColumn
				title='Mid-Tier'
				skins={loadout.midTier}
				onCardClick={onCardClick}
			/>
			<WeaponColumn
				title='Rifles'
				skins={loadout.rifles}
				onCardClick={onCardClick}
			/>
		</div>
	);
}
