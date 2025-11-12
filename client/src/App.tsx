import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/Home/HomePage';
import LoadoutPage from './pages/Loadout/LoadoutPage';

function App() {
	return (
		<Routes>
			<Route path='/' element={<HomePage />} />
			<Route path='/loadout' element={<LoadoutPage />} />
			{/* <Route path="*" element={<NotFoundPage />} /> */}
		</Routes>
	);
}

export default App;
