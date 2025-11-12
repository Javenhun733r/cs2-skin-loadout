import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SkinCard } from '../../components/skin-card/SkinCard';
import { SkinGrid } from '../../components/skin-grid/SkinGrid';
import * as api from '../../lib/api';
import type { SkinWithDistance } from '../../types/types';
import './LoadoutPage.css';

function LoadoutPage() {
	const [loadout, setLoadout] = useState<SkinWithDistance[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchParams] = useSearchParams();

	const color = searchParams.get('color');

	useEffect(() => {
		if (!color) {
			setError('No color specified.');
			return;
		}

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
	}, [color]);
	return (
		<section>
			<div className='LoadoutHeader'>
				<Link to='/' className='BackLink'>
					&larr; Back to Search
				</Link>
				<h2>
					Full Loadout for:{' '}
					<span
						className='ColorChip'
						style={{ backgroundColor: `#${color}` }}
					/>{' '}
					#{color}
				</h2>
			</div>

			<main>
				{isLoading && <h2 className='ResultsHeader'>Building Loadout...</h2>}
				{error && <p className='ErrorText'>{error}</p>}

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
