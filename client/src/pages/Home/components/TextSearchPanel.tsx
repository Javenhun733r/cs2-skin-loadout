import { Alert } from '../../../components/ui/alert/Alert';
import { SearchInput } from '../../../components/ui/search-input/SearchInput';
import { Spinner } from '../../../components/ui/spinner/Spinner';
import type { Skin } from '../../../types/types';

interface TextSearchPanelProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	clearSearch: () => void;
	isLoading: boolean;
	results: Skin[];
	onSelectSkin: (skin: Skin) => void;
	error: string | null;
}

export function TextSearchPanel({
	searchQuery,
	setSearchQuery,
	clearSearch,
	isLoading,
	results,
	onSelectSkin,
	error,
}: TextSearchPanelProps) {
	return (
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
					onClear={clearSearch}
				/>

				{isLoading && <Spinner />}

				{results.length > 0 && (
					<div className='SearchResults'>
						{results.map(skin => (
							<div
								key={skin.id}
								className='SearchResultItem'
								onClick={() => onSelectSkin(skin)}
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
			{error && <Alert type='error'>{error}</Alert>}
		</div>
	);
}
