import React from 'react';
import './SkinGrid.css';

interface SkinGridProps {
	children: React.ReactNode;
}

export function SkinGrid({ children }: SkinGridProps) {
	return <div className='SkinGrid'>{children}</div>;
}
