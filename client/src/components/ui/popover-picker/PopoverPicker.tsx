import { useCallback, useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import './PopoverPicker.css';

interface PopoverPickerProps {
	color: string;
	onChange: (color: string) => void;
}

export const PopoverPicker = ({ color, onChange }: PopoverPickerProps) => {
	const [isOpen, toggle] = useState(false);
	const popover = useRef<HTMLDivElement>(null);

	const close = useCallback(() => toggle(false), []);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (popover.current && !popover.current.contains(event.target as Node)) {
				close();
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen, close]);

	return (
		<div className='picker'>
			<div
				className='swatch'
				style={{ backgroundColor: color }}
				onClick={() => toggle(true)}
			/>

			{isOpen && (
				<div className='popover' ref={popover}>
					<HexColorPicker color={color} onChange={onChange} />
				</div>
			)}
		</div>
	);
};
