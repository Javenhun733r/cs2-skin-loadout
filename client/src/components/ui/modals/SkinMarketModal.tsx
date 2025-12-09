import { AnimatePresence, motion } from 'framer-motion';
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

	const links = skin ? getMarketplaceLinks(skin.name) : [];
	const rarityColor = skin ? getRarityColor(skin.rarity) : '#ccc';

	const getCSGOSkinsUrl = (name: string) => {
		let slug = name.toLowerCase();

		slug = slug.replace('★ ', '');
		slug = slug.replace('stattrak™ ', '');
		slug = slug.replace('souvenir ', '');

		slug = slug.split('(')[0];

		slug = slug.trim();

		slug = slug.replace(/ \| /g, '-');

		slug = slug.replace(/\s+/g, '-');

		slug = slug.replace(/[^a-z0-9-]/g, '');

		slug = slug.replace(/-+/g, '-');

		return `https://csgoskins.gg/items/${slug}#inspect-container`;
	};

	const inspectUrl = skin ? getCSGOSkinsUrl(skin.name) : '#';

	return createPortal(
		<AnimatePresence>
			{isOpen && skin && (
				<motion.div
					className='ModalOverlay'
					onClick={onClose}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<motion.div
						className='ModalContent'
						onClick={e => e.stopPropagation()}
						style={
							{
								'--rarity-color': rarityColor,
							} as React.CSSProperties
						}
						initial={{ scale: 0.95, opacity: 0, y: 20 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.95, opacity: 0, y: 20 }}
						transition={{
							type: 'spring',
							damping: 25,
							stiffness: 300,
							duration: 0.3,
						}}
					>
						<div className='ModalGlow' />

						<button className='CloseButton' onClick={onClose}>
							✕
						</button>

						<div className='ModalHeader'>
							<h3 className='ModalTitle'>{skin.name}</h3>
							{skin.weapon && (
								<span className='ModalSubtitle'>{skin.weapon}</span>
							)}
						</div>

						<div className='ModalBody'>
							<div className='ModalImageContainer'>
								<img src={skin.image} alt={skin.name} className='ModalImage' />

								<a
									href={inspectUrl}
									target='_blank'
									rel='noopener noreferrer'
									className='InspectButton'
									title='Inspect 3D Model on CSGOSkins.gg'
								>
									<span>🧊</span> 3D Inspection
								</a>
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
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	);
}
