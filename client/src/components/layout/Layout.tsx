import React from 'react';
import { Header } from './header/Header';

interface LayoutProps {
	children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
	return (
		<div className='AppContainer'>
			<Header />
			<main>{children}</main>
		</div>
	);
}
