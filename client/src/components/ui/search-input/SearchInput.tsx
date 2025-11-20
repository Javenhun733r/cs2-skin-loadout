import React from 'react';
import './SearchInput.css';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	onClear?: () => void;
}

export function SearchInput({ onClear, value, ...props }: SearchInputProps) {
	return (
		<div className='SearchInputWrapper'>
			<span className='SearchIcon'>🔍</span>
			<input className='SearchInput' type='text' value={value} {...props} />
			{value && onClear && (
				<button onClick={onClear} className='ClearButton' type='button'>
					✕
				</button>
			)}
		</div>
	);
}
