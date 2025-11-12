import React from 'react';
import './Button.css';
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	children: React.ReactNode;
};

export function Button({ children, ...props }: ButtonProps) {
	return (
		<button className='Button' {...props}>
			{children}
		</button>
	);
}
