import { formatPrice, getRarityColor } from '../../lib/utils';
import type { Skin, SkinWithDistance } from '../../types/types';
import './SkinCard.css';
interface SkinCardProps {
	skin: Skin | SkinWithDistance;
	onClick?: (skin: Skin) => void;
}

export function SkinCard({ skin, onClick }: SkinCardProps) {
	const handleClick = () => {
		if (onClick) {
			onClick(skin);
		}
	};
	const rarityColor = getRarityColor(skin.rarity);
	const formattedPrice = formatPrice(skin.price);
	return (
		<div
			className='SkinCard'
			onClick={handleClick}
			style={{ borderTop: `4px solid ${rarityColor}` }}
		>
			{formattedPrice && <div className='SkinCardPrice'>{formattedPrice}</div>}
			<img src={skin.image} alt={skin.name} className='SkinCardImage' />
			<p className='SkinCardName'>{skin.name}</p>
			{skin.weapon && <span className='SkinCardWeapon'>{skin.weapon}</span>}
		</div>
	);
}
