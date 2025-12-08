import { Link } from 'react-router-dom';
import { PopoverPicker } from '../../../components/ui/popover-picker/PopoverPicker';
import type { LoadoutMode } from '../hooks/useLoadoutLogic';

interface LoadoutHeaderProps {
	colors: string[];
	mode: LoadoutMode;
	onColorChange: (index: number, color: string) => void;
	onRemoveColor: (index: number) => void;
	onAddColor: () => void;
	onSetMode: (mode: LoadoutMode) => void;
	maxBudget?: number;
	onBudgetChange: (val: number | undefined) => void;
}

export function LoadoutHeader({
	colors,
	mode,
	onColorChange,
	onRemoveColor,
	onAddColor,
	onSetMode,
	maxBudget,
	onBudgetChange,
}: LoadoutHeaderProps) {
	return (
		<div className='LoadoutHeader'>
			<Link to='/' className='BackLink'>
				&larr; Back to Search
			</Link>
			<h2>CS2 Loadout Builder</h2>
			<div className='HeaderControls'>
				<div
					className='ColorsContainer'
					style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
				>
					{colors.map((color, index) => (
						<div
							key={index}
							style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
						>
							<PopoverPicker
								color={color}
								onChange={newColor => onColorChange(index, newColor)}
							/>

							{colors.length > 1 && (
								<button
									onClick={() => onRemoveColor(index)}
									style={{
										fontSize: '10px',
										border: 'none',
										background: 'transparent',
										color: 'var(--color-error-text)',
										cursor: 'pointer',
									}}
								>
									✕
								</button>
							)}
						</div>
					))}

					{colors.length < 3 && (
						<button
							onClick={onAddColor}
							className='AddColorBtn'
							style={{
								width: '30px',
								height: '30px',
								borderRadius: '8px',
								border: '1px dashed var(--color-border)',
								background: 'transparent',
								cursor: 'pointer',
								color: 'var(--color-text-secondary)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: '20px',
							}}
						>
							+
						</button>
					)}
				</div>
				<div
					className='BudgetInputContainer'
					style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
				>
					<span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Max $:</span>
					<input
						type='number'
						placeholder='No Limit'
						value={maxBudget || ''}
						onChange={e => {
							const val = parseInt(e.target.value);
							onBudgetChange(isNaN(val) ? undefined : val);
						}}
						style={{
							width: '80px',
							padding: '8px',
							borderRadius: '8px',
							border: '1px solid var(--color-border)',
							background: 'rgba(0,0,0,0.2)',
							color: 'var(--color-text-primary)',
						}}
					/>
				</div>
				<div className='ModeToggleCompact'>
					<button
						className={`ModeButton ${mode === 'premium' ? 'active' : ''}`}
						onClick={() => onSetMode('premium')}
					>
						Best Match
					</button>
					<button
						className={`ModeButton ${mode === 'budget' ? 'active' : ''}`}
						onClick={() => onSetMode('budget')}
					>
						Budget
					</button>
				</div>
			</div>
		</div>
	);
}
