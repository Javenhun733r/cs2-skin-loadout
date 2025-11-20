import type { KeyboardEvent } from 'react';
import { SearchInput } from '../../../components/ui/search-input/SearchInput';
import type { Skin } from '../../../types/types';

interface TextSearchPanelProps {
	query: string;
	onQueryChange: (val: string) => void;
	suggestions: Skin[];
	onSelectSuggestion: (skin: Skin) => void;
	onSearch: (query: string) => void;
}

export function TextSearchPanel({
	query,
	onQueryChange,
	suggestions,
	onSelectSuggestion,
	onSearch,
}: TextSearchPanelProps) {
	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			if (suggestions.length > 0) {
				onSelectSuggestion(suggestions[0]);
			} else {
				onSearch(query);
			}
		}
	};

	return (
		<div className='SearchBox'>
			<label htmlFor='search-input' className='SearchLabel'>
				Find skins by item name:
			</label>
			<div className='SearchContainer' style={{ position: 'relative' }}>
				<SearchInput
					id='search-input'
					placeholder='Type skin name (e.g. Asiimov)'
					value={query}
					onChange={e => onQueryChange(e.target.value)}
					onClear={() => onQueryChange('')}
					onKeyDown={handleKeyDown}
					autoComplete='off'
				/>

				{suggestions.length > 0 && (
					<div className='SearchResults'>
						{suggestions.map(skin => (
							<div
								key={skin.id}
								className='SearchResultItem'
								onClick={() => onSelectSuggestion(skin)}
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
	);
}
