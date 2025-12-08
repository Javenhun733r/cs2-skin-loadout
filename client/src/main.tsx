import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeProvider.tsx';
import './index.css';
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			staleTime: 1000 * 60 * 5,
		},
	},
});
createRoot(document.getElementById('root')!).render(
	<QueryClientProvider client={queryClient}>
		<ThemeProvider>
			<CurrencyProvider>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</CurrencyProvider>
		</ThemeProvider>
	</QueryClientProvider>
);
