import React from 'react';
import './Alert.css';

interface AlertProps {
	children: React.ReactNode;
	type?: 'error' | 'info';
}

export function Alert({ children, type = 'info' }: AlertProps) {
	return (
		<div className={`Alert ${type === 'error' ? 'AlertError' : 'AlertInfo'}`}>
			{children}
		</div>
	);
}
