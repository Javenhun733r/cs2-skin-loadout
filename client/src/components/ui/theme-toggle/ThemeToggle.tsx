import { useTheme } from '../../../context/useTheme';
import './ThemeToggle.css';

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();

	return (
		<button
			className='ThemeToggle'
			onClick={toggleTheme}
			title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
		>
			{theme === 'light' ? '🌙' : '☀️'}
		</button>
	);
}
