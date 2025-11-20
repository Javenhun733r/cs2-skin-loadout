import './SkinCardSkeleton.css';

export function SkinCardSkeleton() {
	return (
		<div className='SkinCardSkeleton'>
			<div className='SkeletonImage'></div>
			<div className='SkeletonText Title'></div>
			<div className='SkeletonText Subtitle'></div>
		</div>
	);
}
