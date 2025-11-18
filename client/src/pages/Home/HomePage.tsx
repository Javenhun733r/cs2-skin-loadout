import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
import { SkinGrid } from '../../components/skin-grid/SkinGrid';
import { Alert } from '../../components/ui/alert/Alert';
import { Button } from '../../components/ui/button/Button';
import { SearchInput } from '../../components/ui/search-input/SearchInput';
import { Spinner } from '../../components/ui/spinner/Spinner';
import { EmptyState } from '../../components/ui/states/EmptyState';
import * as api from '../../lib/api';

import { useSkinSearch } from '../../hooks/useSkinSearch';

import type { Skin, SkinWithDistance } from '../../types/types';
import './HomePage.css';

type SearchMode = 'premium' | 'budget';

function HomePage() {
	const [colors, setColors] = useState<string[]>(['#663399']);

	const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
	const [similarSkins, setSimilarSkins] = useState<SkinWithDistance[]>([]);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [searchMode, setSearchMode] = useState<SearchMode>('premium');
	const navigate = useNavigate();

	const {
		searchQuery,
		setSearchQuery,
		searchResults,
		isLoading: isSearchLoading,
		error: searchError,
		clearSearch,
	} = useSkinSearch();

	const handleColorChange = (index: number, newColor: string) => {
		const newColors = [...colors];
		newColors[index] = newColor;
		setColors(newColors);
	};

	const addColor = () => {
		if (colors.length < 3) {
			setColors([...colors, '#FFFFFF']);
		}
	};

	const removeColor = (index: number) => {
		if (colors.length > 1) {
			setColors(colors.filter((_, i) => i !== index));
		}
	};

	const findSimilarByColor = useCallback(
		async (targetHexes: string[]) => {
			setIsLoading(true);
			setError(null);
			setSimilarSkins([]);
			try {
				const data = await api.findSimilarSkinsByColors(
					targetHexes,
					20,
					searchMode
				);
				setSimilarSkins(data.filter(skin => skin.id !== selectedSkin?.id));
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		},
		[selectedSkin, searchMode]
	);

	const findSimilarBySkin = useCallback(
		async (skinId: string) => {
			setIsLoading(true);
			setError(null);
			setSimilarSkins([]);
			try {
				const data = await api.findSimilarSkinsBySkinId(skinId, 20, searchMode);
				setSimilarSkins(data.filter(skin => skin.id !== skinId));
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		},
		[searchMode]
	);

	const handleColorPickerSearch = () => {
		setSelectedSkin(null);
		findSimilarByColor(colors);
	};

	const showEmptyState =
		!isLoading && !error && similarSkins.length === 0 && !selectedSkin;

	const handleFindLoadout = () => {
		const targetHex = selectedSkin ? selectedSkin.dominantHex : colors[0];
		navigate(`/loadout?color=${targetHex.replace('#', '')}&mode=${searchMode}`);
	};

	const handleSkinSelect = (skin: Skin) => {
		clearSearch();
		setSelectedSkin(skin);
		findSimilarBySkin(skin.id);
	};

	return (
		<div>
			<div className='SearchArea'>
				<div className='SearchBox'>
					<label htmlFor='color-picker' className='SearchLabel'>
						Find skins matching colors (up to 3):
					</label>

					{colors.map((color, index) => (
						<div
							key={index}
							className='ColorControls'
							style={{ marginBottom: '10px' }}
						>
							<input
								type='color'
								value={color}
								onChange={e => handleColorChange(index, e.target.value)}
								className='ColorPicker'
							/>

							{colors.length > 1 && (
								<Button
									onClick={() => removeColor(index)}
									style={{
										backgroundColor: 'var(--color-error-bg)',
										color: 'var(--color-error-text)',
										minWidth: '40px',
									}}
								>
									X
								</Button>
							)}
						</div>
					))}

					{colors.length < 3 && (
						<Button
							onClick={addColor}
							style={{ width: '100%', marginTop: '5px' }}
						>
							+ Add Color
						</Button>
					)}

					<Button
						onClick={handleColorPickerSearch}
						disabled={isLoading}
						style={{ width: '100%', marginTop: '15px' }}
					>
						{isLoading && !selectedSkin ? 'Searching...' : 'Find by Color(s)'}
					</Button>

					<div className='ModeToggle' style={{ marginTop: '20px' }}>
						<button
							className={`ModeButton ${
								searchMode === 'premium' ? 'active' : ''
							}`}
							onClick={() => setSearchMode('premium')}
						>
							💎 Best Match
						</button>
						<button
							className={`ModeButton ${
								searchMode === 'budget' ? 'active' : ''
							}`}
							onClick={() => setSearchMode('budget')}
						>
							💰 Budget-Friendly
						</button>
					</div>
				</div>

				<span className='Divider'>OR</span>

				<div className='SearchBox'>
					<label htmlFor='search-input' className='SearchLabel'>
						Find skins by item name:
					</label>
					<div className='SearchContainer'>
						<SearchInput
							id='search-input'
							placeholder='e.g., Asiimov, Case Hardened...'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
						/>

						{isSearchLoading && <Spinner />}

						{searchResults.length > 0 && (
							<div className='SearchResults'>
								{searchResults.map(skin => (
									<div
										key={skin.id}
										className='SearchResultItem'
										onClick={() => handleSkinSelect(skin)}
									>
										<img
											src={skin.image}
											alt={skin.name}
											className='SearchResultImage'
										/>
										{skin.name}
									</div>
								))}
							</div>
						)}
					</div>
					{searchError && <Alert type='error'>{searchError}</Alert>}
				</div>
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
						<SkinCard skin={selectedSkin} />
					</div>
				)}

				{isLoading && <Spinner />}
				{error && <Alert type='error'>{error}</Alert>}

				{showEmptyState && (
					<EmptyState
						title='Find Your Perfect Skin'
						message='Start by searching for a skin by name or picking a color.'
					/>
				)}
				{!isLoading && similarSkins.length > 0 && (
					<section>
						<h2 className='ResultsHeader'>Similar Skins</h2>
						<SkinGrid>
							{similarSkins.map(skin => (
								<SkinCard key={skin.id} skin={skin} />
							))}
						</SkinGrid>
					</section>
				)}
			</main>
		</div>
	);
}
export default HomePage;
