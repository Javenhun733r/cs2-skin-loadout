import React from 'react';
import './SearchInput.css';
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function SearchInput(props: InputProps) {
	return <input className='SearchInput' type='text' {...props} />;
}
