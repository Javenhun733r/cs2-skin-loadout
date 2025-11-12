import { Link } from 'react-router-dom';
import './Header.css';
import { ThemeToggle } from '../../ui/theme-toggle/ThemeToggle';
export function Header() {
	return (
		<header className='AppHeader'>
			<Link to='/' className='HeaderLink'>
				<h1>CS2 Skin Comparator</h1>
			</Link>
			<ThemeToggle />
		</header>
	);
}
