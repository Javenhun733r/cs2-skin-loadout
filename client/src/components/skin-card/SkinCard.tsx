import React, { memo, useRef } from 'react';
import { useCurrency } from '../../context/CurrencyContext';

import { getRarityColor } from '../../lib/utils';
import type { Skin, SkinWithDistance } from '../../types/types';
import './SkinCard.css';

interface SkinCardProps {
	skin: Skin | SkinWithDistance;
	onClick?: (skin: Skin) => void;
	isLocked?: boolean;
	onToggleLock?: (skin: Skin) => void;
	disableEffect?: boolean;
}

export const SkinCard = memo(function SkinCard({
	skin,
	onClick,
	isLocked,
	onToggleLock,
	disableEffect = false,
}: SkinCardProps) {
	const { convertPrice } = useCurrency();

	const cardRef = useRef<HTMLDivElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (disableEffect || !cardRef.current || !wrapperRef.current) return;

		const rect = wrapperRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		const rotateX = ((y - centerY) / centerY) * -12;
		const rotateY = ((x - centerX) / centerX) * 12;

		cardRef.current.style.setProperty('--mouse-x', `${x}px`);
		cardRef.current.style.setProperty('--mouse-y', `${y}px`);
		cardRef.current.style.setProperty('--rot-x', `${rotateX}deg`);
		cardRef.current.style.setProperty('--rot-y', `${rotateY}deg`);
	};

	const handleMouseLeave = () => {
		if (disableEffect || !cardRef.current) return;
		cardRef.current.style.setProperty('--mouse-x', '50%');
		cardRef.current.style.setProperty('--mouse-y', '50%');
		cardRef.current.style.setProperty('--rot-x', '0deg');
		cardRef.current.style.setProperty('--rot-y', '0deg');
	};

	const handleClick = () => {
		if (onClick) onClick(skin);
	};

	const handleLockClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onToggleLock) onToggleLock(skin);
	};

	const rarityColor = getRarityColor(skin.rarity);

	const priceDisplay = skin.price
		? skin.price.min === skin.price.max
			? convertPrice(skin.price.min)
			: `${convertPrice(skin.price.min)} - ${convertPrice(skin.price.max)}`
		: 'N/A';

	return (
		<div
			className={`SkinCardWrapper ${disableEffect ? 'Static' : ''}`}
			ref={wrapperRef}
			onClick={handleClick}
			onMouseMove={!disableEffect ? handleMouseMove : undefined}
			onMouseLeave={!disableEffect ? handleMouseLeave : undefined}
		>
			<div
				className='SkinCard'
				ref={cardRef}
				style={
					{
						'--rarity-color': rarityColor,
						borderColor: isLocked ? 'var(--color-accent)' : undefined,
						boxShadow: isLocked ? '0 0 15px var(--color-accent)' : undefined,
					} as React.CSSProperties
				}
			>
				{!disableEffect && <div className='SkinCardHolo' />}

				{onToggleLock && (
					<button
						className={`LockBtn ${isLocked ? 'locked' : ''}`}
						onClick={handleLockClick}
						title={isLocked ? 'Unlock skin' : 'Lock skin'}
					>
						{isLocked ? '🔒' : 'Pk'}
					</button>
				)}

				<div className='SkinCardContent'>
					{skin.price && <div className='SkinCardPrice'>{priceDisplay}</div>}

					<img
						src={skin.image}
						alt={skin.name}
						className='SkinCardImage'
						loading='lazy'
						width='220'
						height='165'
					/>
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
});
