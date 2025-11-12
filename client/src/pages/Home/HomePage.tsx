import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
import { SkinGrid } from '../../components/skin-grid/SkinGrid';
import { Alert } from '../../components/ui/alert/Alert';
import { Button } from '../../components/ui/button/Button';
import { SearchInput } from '../../components/ui/search-input/SearchInput';
import { Spinner } from '../../components/ui/spinner/Spinner';
import { EmptyState } from '../../components/ui/states/EmptyState';
import { useDebounce } from '../../hooks/useDebounce';
import * as api from '../../lib/api';

import type { Skin, SkinWithDistance } from '../../types/types';
import './HomePage.css';

type SearchMode = 'premium' | 'budget';

function HomePage() {
	const [color, setColor] = useState('#663399');
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<Skin[]>([]);
	const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
	const [similarSkins, setSimilarSkins] = useState<SkinWithDistance[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [searchMode, setSearchMode] = useState<SearchMode>('premium');

	const debouncedSearchQuery = useDebounce(searchQuery, 300);
	const navigate = useNavigate();

	const findSimilarByColor = useCallback(
		async (targetHex: string) => {
			setIsLoading(true);
			setError(null);
			setSimilarSkins([]);
			try {
				const data = await api.findSimilarSkinsByColor(
					targetHex,
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

	useEffect(() => {
		const searchByName = async () => {
			if (debouncedSearchQuery.trim() === '') {
				setSearchResults([]);
				return;
			}
			try {
				const data = await api.searchSkinsByName(debouncedSearchQuery);
				setSearchResults(data);
			} catch (err) {
				console.error(err);
			}
		};
		searchByName();
	}, [debouncedSearchQuery]);

	const handleColorPickerSearch = () => {
		setSelectedSkin(null);
		findSimilarByColor(color);
	};

	const showEmptyState =
		!isLoading && !error && similarSkins.length === 0 && !selectedSkin;

	const handleFindLoadout = () => {
		const targetHex = selectedSkin ? selectedSkin.dominantHex : color;

		navigate(`/loadout?color=${targetHex.replace('#', '')}&mode=${searchMode}`);
	};

	const handleSkinSelect = (skin: Skin) => {
		setSearchQuery('');
		setSearchResults([]);
		setSelectedSkin(skin);
		findSimilarBySkin(skin.id);
	};

	return (
		<div>
			<div className='SearchArea'>
				<div className='SearchBox'>
					<label htmlFor='color-picker' className='SearchLabel'>
						Find skins matching a color:
					</label>
					<div className='ColorControls'>
						<input
							type='color'
							value={color}
							id='color-picker'
							onChange={e => setColor(e.target.value)}
							className='ColorPicker'
						/>
						<Button onClick={handleColorPickerSearch} disabled={isLoading}>
							{isLoading && !selectedSkin ? 'Searching...' : 'Find by Color'}
						</Button>
					</div>

					{}
					<div className='ModeToggle'>
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
					{}
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
				</div>
			</div>

			<div className='LoadoutButtonContainer'>
				<Button onClick={handleFindLoadout} disabled={isLoading}>
					{selectedSkin
						? 'Build Loadout From Selected Skin'
						: 'Build Loadout From Color'}
				</Button>
			</div>

			<main>
				{}
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
