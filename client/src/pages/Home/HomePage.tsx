import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { SkinCard } from '../../components/skin-card/SkinCard';
import { SkinGrid } from '../../components/skin-grid/SkinGrid';
import { Button } from '../../components/ui/button/Button';
import { SkinMarketModal } from '../../components/ui/modals/SkinMarketModal';
import type { Skin } from '../../types/types';
import { ColorSearchPanel } from './components/ColorSearchPanel';
import { ResultsSection } from './components/ResultsSection';
import { TextSearchPanel } from './components/TextSearchPanel';
import './HomePage.css';
import { useHomeLogic } from './hooks/useHomeLogic';

function HomePage() {
	const [modalSkin, setModalSkin] = useState<Skin | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const [isSearchOpen, setIsSearchOpen] = useState(true);

	const [isInventoryLoading, setIsInventoryLoading] = useState(false);
	const [inventorySkins, setInventorySkins] = useState<Skin[]>([]);
	const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
	const [visibleInventoryCount, setVisibleInventoryCount] = useState(10);

	const [searchParams] = useSearchParams();
	const isTextSearch = !!searchParams.get('name');

	const {
		colors,
		selectedSkin,
		similarSkins,
		isLoading,
		error,
		searchMode,
		setSearchMode,
		handleColorChange,
		addColor,
		removeColor,
		handleColorPickerSearch,
		handleTextSearch,
		handleSkinSelect,

		suggestionQuery,
		setSuggestionQuery,
		suggestions,

		handleFindLoadout,
		loadMore,
		hasMore,
	} = useHomeLogic();
	useEffect(() => {
		if ([...searchParams.keys()].length === 0) {
			setIsSearchOpen(true);
		}
	}, [searchParams]);
	const handleCardClick = (skin: Skin) => {
		setModalSkin(skin);
		setIsModalOpen(true);
	};

	const onResultClick = (skin: Skin) => {
		if (isTextSearch) {
			handleSkinSelect(skin);
		} else {
			handleCardClick(skin);
		}
	};

	const onInventoryItemClick = (skin: Skin) => {
		handleSkinSelect(skin);

		setIsInventoryModalOpen(false);

		setIsSearchOpen(false);
	};

	const onColorSearchClick = () => {
		handleColorPickerSearch();
		setIsSearchOpen(false);
	};

	const onTextSearchSubmit = (query: string) => {
		handleTextSearch(query);
		setIsSearchOpen(false);
	};

	const onSuggestionSelect = (skin: Skin) => {
		handleSkinSelect(skin);
		setIsSearchOpen(false);
	};

	const handleImportInventory = async () => {
		const steamInput = prompt(
			'Enter your Steam ID, Custom URL, or Profile Link:'
		);
		if (!steamInput) return;

		setIsInventoryLoading(true);
		try {
			const response = await fetch(
				`${
					import.meta.env.VITE_API_URL || '/api'
				}/steam/inventory/${encodeURIComponent(steamInput)}`
			);

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Failed to fetch');
			}

			const skins: Skin[] = await response.json();

			if (skins.length === 0) {
				alert('No matching skins found in public inventory.');
			} else {
				setInventorySkins(skins);
				setVisibleInventoryCount(50);

				setIsInventoryModalOpen(true);
			}
		} catch (e) {
			console.error(e);
			alert(`Error: ${(e as Error).message}`);
		} finally {
			setIsInventoryLoading(false);
		}
	};

	const handleLoadMoreInventory = () => {
		setVisibleInventoryCount(prev => prev + 50);
	};

	const searchAreaVariants = {
		open: {
			opacity: 1,
			height: 'auto',
			marginBottom: '2rem',
			scale: 1,
		},
		closed: {
			opacity: 0,
			height: 0,
			marginBottom: 0,
			scale: 0.95,
			transition: { duration: 0.3 },
		},
	};

	return (
		<div>
			<AnimatePresence initial={false}>
				{isSearchOpen ? (
					<motion.div
						key='search-area'
						initial='closed'
						animate='open'
						exit='closed'
						variants={searchAreaVariants}
						style={{ overflow: 'hidden' }}
					>
						<div className='SearchArea'>
							<ColorSearchPanel
								colors={colors}
								onColorChange={handleColorChange}
								onRemoveColor={removeColor}
								onAddColor={addColor}
								onSearch={onColorSearchClick}
								isLoading={isLoading}
								selectedSkin={selectedSkin}
								searchMode={searchMode}
								setSearchMode={setSearchMode}
							/>

							<span className='Divider'>OR</span>

							<TextSearchPanel
								query={suggestionQuery}
								onQueryChange={setSuggestionQuery}
								suggestions={suggestions}
								onSelectSuggestion={onSuggestionSelect}
								onSearch={onTextSearchSubmit}
							/>
						</div>
					</motion.div>
				) : (
					<motion.div
						key='reopen-button'
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						style={{ textAlign: 'center', marginBottom: '2rem' }}
					>
						<Button
							onClick={() => setIsSearchOpen(true)}
							style={{
								background: 'var(--color-surface)',
								color: 'var(--color-text-primary)',
								border: '1px solid var(--color-border)',
								boxShadow: 'var(--shadow-sm)',
								fontSize: '14px',
								padding: '10px 20px',
							}}
						>
							🔍 Modify Search Parameters
						</Button>
					</motion.div>
				)}
			</AnimatePresence>

			<div className='LoadoutButtonContainer'>
				{!isSearchOpen || selectedSkin ? (
					<Button onClick={handleFindLoadout} disabled={isLoading}>
						{selectedSkin
							? 'Build Loadout From Selected Skin'
							: 'Build Loadout From Color(s)'}
					</Button>
				) : null}

				<Button
					onClick={handleImportInventory}
					disabled={isLoading || isInventoryLoading}
					style={{ marginLeft: '10px', background: '#2a475e' }}
				>
					{isInventoryLoading ? 'Loading Inventory...' : '📥 Import Steam Inv'}
				</Button>
			</div>

			<main>
				{selectedSkin && (
					<div className='SelectedSkinArea'>
						<h3>Base Skin:</h3>
						<SkinCard skin={selectedSkin} onClick={handleCardClick} />
					</div>
				)}

				<ResultsSection
					isLoading={isLoading}
					error={error}
					similarSkins={similarSkins}
					selectedSkin={selectedSkin}
					onCardClick={onResultClick}
				/>

				{similarSkins.length > 0 && hasMore && !isLoading && (
					<div
						style={{
							textAlign: 'center',
							marginTop: '40px',
							marginBottom: '40px',
						}}
					>
						<Button onClick={() => loadMore()}>Load More Skins</Button>
					</div>
				)}

				{similarSkins.length > 0 && isLoading && (
					<div style={{ textAlign: 'center', marginTop: '20px' }}>
						Loading more...
					</div>
				)}
			</main>
			<AnimatePresence>
				{isInventoryModalOpen && (
					<motion.div
						className='ModalOverlay'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setIsInventoryModalOpen(false)}
						style={{ zIndex: 2000 }}
					>
						<motion.div
							className='ModalContent'
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							onClick={e => e.stopPropagation()}
							style={{
								width: '90%',
								maxWidth: '1200px',
								maxHeight: '85vh',
								overflowY: 'auto',
								padding: '24px',
								borderTop: 'none',
							}}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									marginBottom: '20px',
								}}
							>
								<div>
									<h2 style={{ margin: 0 }}>Select a Base Skin</h2>
									<p
										style={{
											margin: '4px 0 0',
											fontSize: '0.9rem',
											color: 'var(--color-text-secondary)',
										}}
									>
										Showing{' '}
										{Math.min(visibleInventoryCount, inventorySkins.length)} of{' '}
										{inventorySkins.length} items
									</p>
								</div>
								<button
									className='CloseButton'
									onClick={() => setIsInventoryModalOpen(false)}
									style={{ position: 'static' }}
								>
									✕
								</button>
							</div>

							<SkinGrid>
								{inventorySkins
									.slice(0, visibleInventoryCount)
									.map((skin, index) => (
										<SkinCard
											key={`${skin.id}-${index}`}
											skin={skin}
											onClick={onInventoryItemClick}
											disableEffect={true}
										/>
									))}
							</SkinGrid>
							{visibleInventoryCount < inventorySkins.length && (
								<div
									style={{
										textAlign: 'center',
										marginTop: '30px',
										paddingBottom: '20px',
									}}
								>
									<Button onClick={handleLoadMoreInventory}>
										Load More ({inventorySkins.length - visibleInventoryCount}
										remaining)
									</Button>
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<SkinMarketModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				skin={modalSkin}
			/>
		</div>
	);
}

export default HomePage;
