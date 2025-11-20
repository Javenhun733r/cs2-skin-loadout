import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getMarketplaceLinks } from '../../../lib/marketplaces';
import { getRarityColor } from '../../../lib/utils';
import type { Skin, SkinWithDistance } from '../../../types/types';
import './SkinMarketModal.css';

interface SkinMarketModalProps {
	isOpen: boolean;
	onClose: () => void;
	skin: Skin | SkinWithDistance | null;
}

export function SkinMarketModal({
	isOpen,
	onClose,
	skin,
}: SkinMarketModalProps) {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isOpen]);

	if (!isOpen || !skin) return null;

	const links = getMarketplaceLinks(skin.name);
	const rarityColor = getRarityColor(skin.rarity);

	return createPortal(
		<div className='ModalOverlay' onClick={onClose}>
			<div
				className='ModalContent'
				onClick={e => e.stopPropagation()}
				style={{ borderTop: `4px solid ${rarityColor}` }}
			>
				<button className='CloseButton' onClick={onClose}>
					✕
				</button>

				<div className='ModalHeader'>
					<h3 className='ModalTitle'>{skin.name}</h3>
					{skin.weapon && <span className='ModalSubtitle'>{skin.weapon}</span>}
				</div>

				<div className='ModalBody'>
					<div className='ModalImageContainer'>
						<img src={skin.image} alt={skin.name} className='ModalImage' />
					</div>

					<div className='MarketLinks'>
						<h4>Buy Now:</h4>
						<div className='LinksGrid'>
							{links.map(link => (
								<a
									key={link.name}
									href={link.url}
									target='_blank'
									rel='noopener noreferrer'
									className='MarketButton'
									style={
										{
											'--btn-hover-color': link.color,
										} as React.CSSProperties
									}
								>
									{link.name} ↗
								</a>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
}
