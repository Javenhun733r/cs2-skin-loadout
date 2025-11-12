import { useContext } from 'react';
import { ThemeContext, type ThemeContextType } from './theme';

export function useTheme() {
	const context = useContext<ThemeContextType | undefined>(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
