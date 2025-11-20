import { Button } from '../../../components/ui/button/Button';
import { PopoverPicker } from '../../../components/ui/popover-picker/PopoverPicker';
import type { Skin } from '../../../types/types';

type SearchMode = 'premium' | 'budget';

interface ColorSearchPanelProps {
	colors: string[];
	onColorChange: (index: number, color: string) => void;
	onRemoveColor: (index: number) => void;
	onAddColor: () => void;
	onSearch: () => void;
	isLoading: boolean;
	selectedSkin: Skin | null;
	searchMode: SearchMode;
	setSearchMode: (mode: SearchMode) => void;
}

export function ColorSearchPanel({
	colors,
	onColorChange,
	onRemoveColor,
	onAddColor,
	onSearch,
	isLoading,
	selectedSkin,
	searchMode,
	setSearchMode,
}: ColorSearchPanelProps) {
	return (
		<div className='SearchBox'>
			<label htmlFor='color-picker' className='SearchLabel'>
				Find skins matching colors (up to 3):
			</label>

			<div className='ColorPickerContainer'>
				{colors.map((color, index) => (
					<div key={index} className='ColorControls'>
						<PopoverPicker
							color={color}
							onChange={newColor => onColorChange(index, newColor)}
						/>

						{colors.length > 1 && (
							<button
								className='RemoveColorButton'
								onClick={() => onRemoveColor(index)}
								title='Remove color'
							>
								✕
							</button>
						)}
					</div>
				))}

				{colors.length < 3 && (
					<button onClick={onAddColor} className='AddColorButton'>
						+
					</button>
				)}
			</div>

			<Button
				onClick={onSearch}
				disabled={isLoading}
				style={{ width: '100%', marginTop: '20px' }}
			>
				{isLoading && !selectedSkin ? 'Searching...' : 'Find by Color(s)'}
			</Button>

			<div className='ModeToggle' style={{ marginTop: '20px' }}>
				<button
					className={`ModeButton ${searchMode === 'premium' ? 'active' : ''}`}
					onClick={() => setSearchMode('premium')}
				>
					💎 Best Match
				</button>
				<button
					className={`ModeButton ${searchMode === 'budget' ? 'active' : ''}`}
					onClick={() => setSearchMode('budget')}
				>
					💰 Budget-Friendly
				</button>
			</div>
		</div>
	);
}
