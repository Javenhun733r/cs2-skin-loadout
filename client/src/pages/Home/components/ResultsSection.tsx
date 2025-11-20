import { motion } from 'framer-motion';
import { SkinCard } from '../../../components/skin-card/SkinCard';
import { SkinGrid } from '../../../components/skin-grid/SkinGrid';
import { Alert } from '../../../components/ui/alert/Alert';
import { SkinCardSkeleton } from '../../../components/ui/skeleton/SkinCardSkeleton';
import { EmptyState } from '../../../components/ui/states/EmptyState';
import type { Skin, SkinWithDistance } from '../../../types/types';

interface ResultsSectionProps {
	isLoading: boolean;
	error: string | null;
	similarSkins: SkinWithDistance[];
	selectedSkin: Skin | null;
	onCardClick: (skin: Skin) => void;
}

export function ResultsSection({
	isLoading,
	error,
	similarSkins,
	selectedSkin,
	onCardClick,
}: ResultsSectionProps) {
	if (isLoading && similarSkins.length === 0) {
		return (
			<section>
				<h2 className='ResultsHeader'>Searching...</h2>
				<SkinGrid>
					{[...Array(10)].map((_, i) => (
						<SkinCardSkeleton key={i} />
					))}
				</SkinGrid>
			</section>
		);
	}

	if (error) {
		return <Alert type='error'>{error}</Alert>;
	}

	const showEmptyState =
		!isLoading && !error && similarSkins.length === 0 && !selectedSkin;

	if (showEmptyState) {
		return (
			<EmptyState
				title='Find Your Perfect Skin'
				message='Start by searching for a skin by name or picking a color.'
			/>
		);
	}

	if (similarSkins.length > 0) {
		return (
			<section>
				<h2 className='ResultsHeader'>Similar Skins</h2>
				<SkinGrid>
					{similarSkins.map((skin, index) => (
						<motion.div
							key={`${skin.id}-${index}`}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: (index % 20) * 0.05 }}
						>
							<SkinCard skin={skin} onClick={onCardClick} />
						</motion.div>
					))}
				</SkinGrid>
			</section>
		);
	}

	return null;
}
