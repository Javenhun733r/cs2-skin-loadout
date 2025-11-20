import { Link } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
import { Alert } from '../../components/ui/alert/Alert';
import { SkinMarketModal } from '../../components/ui/modals/SkinMarketModal';
import { PopoverPicker } from '../../components/ui/popover-picker/PopoverPicker';
import { Spinner } from '../../components/ui/spinner/Spinner';
import { getRarityColor } from '../../lib/utils';
import { LoadoutDisplay } from './components/LoadoutDisplay';
import { TeamToggle } from './components/TeamToggle';
import { useLoadoutLogic } from './hooks/useLoadoutLogic';
import './LoadoutPage.css';

export default function LoadoutPage() {
	const {
		colors,
		mode,
		team,
		setTeam,
		setMode,
		categorized,
		isLoading,
		error,
		modalSkin,
		isModalOpen,
		setIsModalOpen,
		handleColorChange,
		addColor,
		removeColor,
		handleCardClick,
	} = useLoadoutLogic();

	const hasItems =
		categorized.pistols.length > 0 ||
		categorized.midTier.length > 0 ||
		categorized.rifles.length > 0 ||
		categorized.knife ||
		categorized.glove;

	return (
		<section className='LoadoutPage' data-team={team}>
			<div className='LoadoutHeader'>
				<div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
					<Link to='/' className='BackLink'>
						← Back
					</Link>
					<TeamToggle side={team} onChange={setTeam} />
				</div>

				<div className='HeaderControls'>
					<div
						className='ColorsContainer'
						style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
					>
						{colors.map((color, index) => (
							<div
								key={index}
								style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
							>
								<PopoverPicker
									color={color}
									onChange={newColor => handleColorChange(index, newColor)}
								/>
								{colors.length > 1 && (
									<button
										onClick={() => removeColor(index)}
										style={{
											fontSize: '12px',
											border: 'none',
											background: 'transparent',
											color: 'var(--color-text-secondary)',
											cursor: 'pointer',
											opacity: 0.7,
										}}
									>
										✕
									</button>
								)}
							</div>
						))}
						{colors.length < 3 && (
							<button
								onClick={addColor}
								className='AddColorBtn'
								style={{
									width: '40px',
									height: '40px',
									borderRadius: '10px',
									border: '2px dashed var(--color-border)',
									background: 'transparent',
									cursor: 'pointer',
									color: 'var(--color-text-secondary)',
									fontSize: '20px',
								}}
							>
								+
							</button>
						)}
					</div>

					<div className='ModeToggleCompact'>
						<button
							className={`ModeButton ${mode === 'premium' ? 'active' : ''}`}
							onClick={() => setMode('premium')}
						>
							Best Match
						</button>
						<button
							className={`ModeButton ${mode === 'budget' ? 'active' : ''}`}
							onClick={() => setMode('budget')}
						>
							Budget
						</button>
					</div>
				</div>
			</div>

			{isLoading && <Spinner />}
			{error && <Alert type='error'>{error}</Alert>}

			{!isLoading && !hasItems && !error && (
				<Alert type='info'>
					No matching skins found. Try adjusting colors.
				</Alert>
			)}

			{!isLoading && hasItems && (
				<div className='LoadoutGrid'>
					<div className='SidePanel'>
						{categorized.agent ? (
							<div
								className='AgentCard'
								onClick={() => handleCardClick(categorized.agent!)}
								style={{ cursor: 'pointer' }}
							>
								<img
									src={categorized.agent.image}
									alt={categorized.agent.name}
									className='AgentImage'
								/>
								<div className='AgentName'>{categorized.agent.name}</div>
								<span
									className='AgentRarity'
									style={{ color: getRarityColor(categorized.agent.rarity) }}
								>
									{categorized.agent.rarity} Agent
								</span>
							</div>
						) : (
							<div className='AgentCard'>
								<div className='AgentSilhouette'>👤</div>
								<span>{team} Agent</span>
							</div>
						)}

						<div className='EquipmentGrid'>
							{categorized.knife ? (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '5px',
									}}
								>
									<span
										className='CategoryHeader'
										style={{ fontSize: '0.7rem' }}
									>
										Melee
									</span>
									<SkinCard
										skin={categorized.knife}
										onClick={handleCardClick}
									/>
								</div>
							) : (
								<div className='EmptySlot'>No Knife</div>
							)}

							{categorized.glove ? (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '5px',
									}}
								>
									<span
										className='CategoryHeader'
										style={{ fontSize: '0.7rem' }}
									>
										Gloves
									</span>
									<SkinCard
										skin={categorized.glove}
										onClick={handleCardClick}
									/>
								</div>
							) : (
								<div className='EmptySlot'>No Gloves</div>
							)}
						</div>
					</div>

					<LoadoutDisplay loadout={categorized} onCardClick={handleCardClick} />
				</div>
			)}

			<SkinMarketModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				skin={modalSkin}
			/>
		</section>
	);
}
