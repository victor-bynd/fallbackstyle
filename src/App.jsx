
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MultiLanguageFallback from './pages/MultiLanguageFallback';
import BrandFontFallback from './pages/BrandFontFallback';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/multi-language/*" element={<MultiLanguageFallback />} />
      <Route path="/brand-font" element={<BrandFontFallback />} />
    </Routes>
  );
};

export default App;
