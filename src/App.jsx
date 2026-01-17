
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './apps/landing/index';
import MultiLanguageFallback from './apps/multi-language/index';
import BrandFontFallback from './apps/brand-font/index';

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
