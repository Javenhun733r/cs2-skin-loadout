import './TeamToggle.css';

interface TeamToggleProps {
	side: 'CT' | 'T';
	onChange: (side: 'CT' | 'T') => void;
}

export function TeamToggle({ side, onChange }: TeamToggleProps) {
	return (
		<div className='TeamToggle'>
			<button
				className={`TeamButton CT ${side === 'CT' ? 'active' : ''}`}
				onClick={() => onChange('CT')}
			>
				<span className='TeamIcon'>🛡️</span> EQUIP CT
			</button>
			<button
				className={`TeamButton T ${side === 'T' ? 'active' : ''}`}
				onClick={() => onChange('T')}
			>
				<span className='TeamIcon'>⚔️</span> EQUIP T
			</button>
		</div>
	);
}
