import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/Home/HomePage';
import LoadoutPage from './pages/Loadout/LoadoutPage';
import { Layout } from './components/layout/Layout';
import './App.css';

function App() {
	return (
		<Layout>
			<Routes>
				<Route path='/' element={<HomePage />} />
				<Route path='/loadout' element={<LoadoutPage />} />
				{/* <Route path="*" element={<NotFoundPage />} /> */}
			</Routes>
		</Layout>
	);
}

export default App;
