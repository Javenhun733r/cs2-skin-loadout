import React, { createContext, useContext, useState } from 'react';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CNY';

interface CurrencyContextType {
	currency: Currency;
	setCurrency: (c: Currency) => void;
	convertPrice: (cents: number) => string;
}

const RATES: Record<Currency, number> = {
	USD: 1,
	EUR: 0.92,
	GBP: 0.79,
	CNY: 7.19,
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(
	undefined
);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
	const [currency, setCurrency] = useState<Currency>('USD');

	const convertPrice = (cents: number) => {
		const rate = RATES[currency];
		const value = (cents / 100) * rate;

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
		}).format(value);
	};

	return (
		<CurrencyContext.Provider value={{ currency, setCurrency, convertPrice }}>
			{children}
		</CurrencyContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
	const context = useContext(CurrencyContext);
	if (!context) {
		throw new Error('useCurrency must be used within CurrencyProvider');
	}
	return context;
}
