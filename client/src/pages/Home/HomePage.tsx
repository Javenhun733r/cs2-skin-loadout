import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
import { SkinGrid } from '../../components/skin-grid/SkinGrid';
import { Button } from '../../components/ui/button/Button';
import { SearchInput } from '../../components/ui/search-input/SearchInput';
import { useDebounce } from '../../hooks/useDebounce';
import * as api from '../../lib/api';
import { rgbToHex } from '../../lib/utils';
import type { Skin, SkinWithDistance } from '../../types/types';
import './HomePage.css';

function HomePage() {
	const [color, setColor] = useState('#663399');
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<Skin[]>([]);
	const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
	const [similarSkins, setSimilarSkins] = useState<SkinWithDistance[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const debouncedSearchQuery = useDebounce(searchQuery, 300);
	const navigate = useNavigate();

	const findSimilar = useCallback(
		async (targetHex: string) => {
			setIsLoading(true);
			setError(null);
			setSimilarSkins([]);
			try {
				const data = await api.findSimilarSkins(targetHex);
				setSimilarSkins(data.filter(skin => skin.id !== selectedSkin?.id));
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		},
		[selectedSkin]
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
		findSimilar(color);
	};

	const handleFindLoadout = () => {
		const targetHex = selectedSkin
			? rgbToHex(
					selectedSkin.primaryR,
					selectedSkin.primaryG,
					selectedSkin.primaryB
			  )
			: color;
		navigate(`/loadout?color=${targetHex.replace('#', '')}`);
	};

	const handleSkinSelect = (skin: Skin) => {
		setSearchQuery('');
		setSearchResults([]);
		setSelectedSkin(skin);
		const hex = rgbToHex(skin.primaryR, skin.primaryG, skin.primaryB);
		findSimilar(hex);
	};

	return (
		<div>
			<div className='SearchArea'>
				<div className='SearchBox'>
					<p>Find skins matching a color:</p>
					<div className='ColorControls'>
						<input
							type='color'
							value={color}
							onChange={e => setColor(e.target.value)}
							className='ColorPicker'
						/>
						<Button onClick={handleColorPickerSearch} disabled={isLoading}>
							{isLoading && !selectedSkin ? 'Searching...' : 'Find by Color'}
						</Button>
					</div>
				</div>

				<span className='Divider'>OR</span>

				<div className='SearchBox'>
					<p>Find skins by item name:</p>
					<div className='SearchContainer'>
						<SearchInput
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
				{selectedSkin && (
					<div className='SelectedSkinArea'>
						<h3>Base Skin:</h3>
						<SkinCard skin={selectedSkin} />
					</div>
				)}

				{isLoading && <h2 className='ResultsHeader'>Loading...</h2>}
				{error && <p className='ErrorText'>{error}</p>}

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
