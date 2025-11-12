import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
import { SkinGrid } from '../../components/skin-grid/SkinGrid';
import { Alert } from '../../components/ui/alert/Alert';
import { Spinner } from '../../components/ui/spinner/Spinner';
import * as api from '../../lib/api';
import type { SkinWithDistance } from '../../types/types';
import './LoadoutPage.css';

type LoadoutMode = 'premium' | 'budget';

export default function LoadoutPage() {
	const [loadout, setLoadout] = useState<SkinWithDistance[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();

	const [color, setColor] = useState(searchParams.get('color') || '663399');
	const [mode, setMode] = useState<LoadoutMode>(
		(searchParams.get('mode') as LoadoutMode) || 'premium'
	);

	useEffect(() => {
		if (!color) {
			setError('No color specified.');
			return;
		}

		setSearchParams({ color, mode });

		const loadData = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const data = await api.fetchLoadout(color, mode);
				setLoadout(data);
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [color, mode, setSearchParams]);

	return (
		<section>
			<div className='LoadoutHeader'>
				<Link to='/' className='BackLink'>
					&larr; Back to Search
				</Link>
				<h2>Full Loadout for:</h2>
				<input
					type='color'
					className='ColorPicker'
					value={`#${color}`}
					onChange={e => setColor(e.target.value.replace('#', ''))}
				/>
			</div>

			{}
			<div className='ModeToggle'>
				<button
					className={`ModeButton ${mode === 'premium' ? 'active' : ''}`}
					onClick={() => setMode('premium')}
				>
					💎 Best Match
				</button>
				<button
					className={`ModeButton ${mode === 'budget' ? 'active' : ''}`}
					onClick={() => setMode('budget')}
				>
					💰 Budget-Friendly
				</button>
			</div>

			<main>
				{isLoading && <Spinner />}
				{error && <Alert type='error'>{error}</Alert>}

				{!isLoading && !error && loadout.length === 0 && (
					<Alert type='info'>
						No weapon skins found for this color combination.
					</Alert>
				)}

				{!isLoading && loadout.length > 0 && (
					<SkinGrid>
						{loadout.map(skin => (
							<SkinCard key={skin.id} skin={skin} />
						))}
					</SkinGrid>
				)}
			</main>
		</section>
	);
}
