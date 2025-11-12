import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
import { SkinGrid } from '../../components/skin-grid/SkinGrid';
import { Alert } from '../../components/ui/alert/Alert';
import { Spinner } from '../../components/ui/spinner/Spinner';
import * as api from '../../lib/api';
import type { SkinWithDistance } from '../../types/types';
import './LoadoutPage.css';

function LoadoutPage() {
	const [loadout, setLoadout] = useState<SkinWithDistance[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();

	const [color, setColor] = useState(searchParams.get('color') || '663399');

	useEffect(() => {
		if (!color) {
			setError('No color specified.');
			return;
		}
		setSearchParams({ color });
		const loadData = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const data = await api.fetchLoadout(color);
				setLoadout(data);
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [color, setSearchParams]);
	return (
		<section>
			<div className='LoadoutHeader'>
				<Link to='/' className='BackLink'>
					&larr; Back to Search
				</Link>
				<h2>
					Full Loadout for:{' '}
					<input
						type='color'
						className='ColorPicker'
						value={`#${color}`}
						onChange={e => setColor(e.target.value.replace('#', ''))}
					/>
					#{color}
				</h2>
			</div>

			<main>
				{isLoading && <Spinner />}
				{error && <Alert type='error'>{error}</Alert>}

				{!isLoading && !error && loadout.length === 0 && (
					<Alert type='info'>No weapon skins found for this color.</Alert>
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

export default LoadoutPage;
