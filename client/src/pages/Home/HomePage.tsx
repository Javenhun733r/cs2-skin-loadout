import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { useSearchParams } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
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
			{}
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

			{}
			<div className='LoadoutButtonContainer'>
				{!isSearchOpen || selectedSkin ? (
					<Button onClick={handleFindLoadout} disabled={isLoading}>
						{selectedSkin
							? 'Build Loadout From Selected Skin'
							: 'Build Loadout From Color(s)'}
					</Button>
				) : null}
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

				{}
				{similarSkins.length > 0 && hasMore && !isLoading && (
					<div
						style={{
							textAlign: 'center',
							marginTop: '40px',
							marginBottom: '40px',
						}}
					>
						{}
						<Button onClick={() => loadMore()}>Load More Skins</Button>
					</div>
				)}

				{similarSkins.length > 0 && isLoading && (
					<div style={{ textAlign: 'center', marginTop: '20px' }}>
						Loading more...
					</div>
				)}
			</main>

			<SkinMarketModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				skin={modalSkin}
			/>
		</div>
	);
}

export default HomePage;
