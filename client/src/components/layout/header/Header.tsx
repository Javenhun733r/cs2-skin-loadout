import { Link } from 'react-router-dom';
import { useCurrency, type Currency } from '../../../context/CurrencyContext';
import { ThemeToggle } from '../../ui/theme-toggle/ThemeToggle';
import './Header.css';

export function Header() {
	const { currency, setCurrency } = useCurrency();

	return (
		<header className='AppHeader'>
			<Link to='/' className='HeaderLink'>
				<h1>CS2 Skin Comparator</h1>
			</Link>
			<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
				<select
					value={currency}
					onChange={e => setCurrency(e.target.value as Currency)}
					style={{
						background: 'transparent',
						color: 'var(--color-text-primary)',
						border: '1px solid var(--color-border)',
						padding: '4px',
						borderRadius: '4px',
					}}
				>
					<option value='USD'>USD</option>
					<option value='EUR'>EUR</option>
					<option value='GBP'>GBP</option>
					<option value='CNY'>CNY</option>
				</select>
				<ThemeToggle />
			</div>
		</header>
	);
}
