import './EmptyState.css';

interface EmptyStateProps {
	title: string;
	message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
	return (
		<div className='EmptyState'>
			<h3>{title}</h3>
			<label>{message}</label>
		</div>
	);
}
