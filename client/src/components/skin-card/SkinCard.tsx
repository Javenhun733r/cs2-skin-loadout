import React, { useRef } from 'react';
import { formatPrice, getRarityColor } from '../../lib/utils';
import type { Skin, SkinWithDistance } from '../../types/types';
import './SkinCard.css';

interface SkinCardProps {
	skin: Skin | SkinWithDistance;
	onClick?: (skin: Skin) => void;
}

export function SkinCard({ skin, onClick }: SkinCardProps) {
	const cardRef = useRef<HTMLDivElement>(null);

	const wrapperRef = useRef<HTMLDivElement>(null);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!cardRef.current || !wrapperRef.current) return;

		const card = cardRef.current;
		const rect = wrapperRef.current.getBoundingClientRect();

		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		const rotateX = ((y - centerY) / centerY) * -12;
		const rotateY = ((x - centerX) / centerX) * 12;

		card.style.setProperty('--mouse-x', `${x}px`);
		card.style.setProperty('--mouse-y', `${y}px`);
		card.style.setProperty('--rot-x', `${rotateX}deg`);
		card.style.setProperty('--rot-y', `${rotateY}deg`);
	};

	const handleMouseLeave = () => {
		if (!cardRef.current) return;
		const card = cardRef.current;

		card.style.setProperty('--mouse-x', '50%');
		card.style.setProperty('--mouse-y', '50%');
		card.style.setProperty('--rot-x', '0deg');
		card.style.setProperty('--rot-y', '0deg');
	};

	const handleClick = () => {
		if (onClick) {
			onClick(skin);
		}
	};

	const formattedPrice = formatPrice(skin.price);
	const rarityColor = getRarityColor(skin.rarity);

	return (
		<div
			className='SkinCardWrapper'
			ref={wrapperRef}
			onClick={handleClick}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
		>
			<div
				className='SkinCard'
				ref={cardRef}
				style={{ '--rarity-color': rarityColor } as React.CSSProperties}
			>
				{}
				<div className='SkinCardHolo' />

				{}
				<div className='SkinCardContent'>
					{formattedPrice && (
						<div className='SkinCardPrice'>{formattedPrice || 'N/A'}</div>
					)}
					<img src={skin.image} alt={skin.name} className='SkinCardImage' />
					<div className='SkinCardInfo'>
						<p className='SkinCardName'>{skin.name}</p>
						{skin.weapon && (
							<span className='SkinCardWeapon'>{skin.weapon}</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
