import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
import { Button } from '../../components/ui/button/Button';
import { SkinMarketModal } from '../../components/ui/modals/SkinMarketModal';
import { useSkinSearch } from '../../hooks/useSkinSearch';
import { HISTOGRAM_COLOR_MAP } from '../../lib/constants';
import type { Skin } from '../../types/types';
import './HomePage.css';

import { ColorSearchPanel } from './components/ColorSearchPanel';
import { ResultsSection } from './components/ResultsSection';
import { TextSearchPanel } from './components/TextSearchPanel';
import { useHomeLogic } from './useHomeLogic';

function HomePage() {
	const navigate = useNavigate();
	const [modalSkin, setModalSkin] = useState<Skin | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

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
		handleSkinSelect,
	} = useHomeLogic();

	const {
		searchQuery,
		setSearchQuery,
		searchResults,
		isLoading: isSearchLoading,
		error: searchError,
		clearSearch,
	} = useSkinSearch();

	const handleCardClick = (skin: Skin) => {
		setModalSkin(skin);
		setIsModalOpen(true);
	};

	const handleSearchSelect = (skin: Skin) => {
		clearSearch();
		handleSkinSelect(skin);
	};

	const handleFindLoadout = () => {
		let targetColors: string[] = [];

		if (selectedSkin) {
			const histogramEntries = Object.entries(selectedSkin).filter(
				([key]) => key.startsWith('hist') && HISTOGRAM_COLOR_MAP[key]
			);

			const sortedColors = histogramEntries.sort(
				(a, b) => (b[1] as number) - (a[1] as number)
			);

			targetColors = sortedColors
				.slice(0, 3)
				.filter(([, value]) => (value as number) > 0.1)
				.map(([key]) => HISTOGRAM_COLOR_MAP[key]);

			if (targetColors.length === 0) {
				targetColors = [selectedSkin.dominantHex];
			}

			if (!targetColors.includes(selectedSkin.dominantHex)) {
				targetColors.unshift(selectedSkin.dominantHex);
				targetColors = targetColors.slice(0, 3);
			}
		} else {
			targetColors = colors;
		}

		const colorsParam = targetColors.map(c => c.replace('#', '')).join(',');
		navigate(`/loadout?colors=${colorsParam}&mode=${searchMode}`);
	};

	return (
		<div>
			<div className='SearchArea'>
				<ColorSearchPanel
					colors={colors}
					onColorChange={handleColorChange}
					onRemoveColor={removeColor}
					onAddColor={addColor}
					onSearch={handleColorPickerSearch}
					isLoading={isLoading}
					selectedSkin={selectedSkin}
					searchMode={searchMode}
					setSearchMode={setSearchMode}
				/>

				<span className='Divider'>OR</span>

				<TextSearchPanel
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					clearSearch={clearSearch}
					isLoading={isSearchLoading}
					results={searchResults}
					onSelectSkin={handleSearchSelect}
					error={searchError}
				/>
			</div>

			<div className='LoadoutButtonContainer'>
				<Button onClick={handleFindLoadout} disabled={isLoading}>
					{selectedSkin
						? 'Build Loadout From Selected Skin'
						: 'Build Loadout From Color(s)'}
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
					onCardClick={handleCardClick}
				/>
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
