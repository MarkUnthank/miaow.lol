import React from 'react';

export function MobileOverlay() {
  return (
    <div className="mobile-overlay">
      <div className="mobile-overlay__card">
        <div className="app-wordmark" aria-label="miaow.lol">
          miaow.lol
        </div>
        <p className="mobile-overlay__message">
          This experience works best on a desktop device. Please come back later on a larger screen!
        </p>
      </div>
    </div>
  );
}
