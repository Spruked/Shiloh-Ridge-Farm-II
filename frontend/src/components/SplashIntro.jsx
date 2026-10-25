import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SPLASH_SEEN_KEY = "shiloh_splash_seen_v1";

function playLambSound() {
  if (typeof window === "undefined") return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const now = context.currentTime;
  const notes = [520, 470, 560, 430, 520, 390];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.11);
    gain.gain.setValueAtTime(0.0001, now + index * 0.11);
    gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.11 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.11 + 0.1);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.11);
    oscillator.stop(now + index * 0.11 + 0.11);
  });

  window.setTimeout(() => context.close().catch(() => {}), 1100);
}

export default function SplashIntro() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_SEEN_KEY) !== "true";
    } catch (_error) {
      return true;
    }
  });

  if (!visible) return null;

  const enterSite = () => {
    playLambSound();
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
    } catch (_error) {
      // Non-blocking persistence.
    }
    setVisible(false);
    navigate("/");
  };

  return (
    <div className="splash-intro" role="dialog" aria-label="Shiloh Ridge Farm intro">
      <div className="splash-sky">
        <div className="splash-sun" />
        <div className="splash-cloud splash-cloud-one" />
        <div className="splash-cloud splash-cloud-two" />
        <div className="splash-ground" />
        <div className="splash-fence">
          <span />
          <span />
          <span />
        </div>
        <div className="splash-sheep" aria-hidden="true">
          <div className="sheep-body" />
          <div className="sheep-head" />
          <div className="sheep-ear" />
          <div className="sheep-leg leg-one" />
          <div className="sheep-leg leg-two" />
          <div className="sheep-leg leg-three" />
          <div className="sheep-leg leg-four" />
        </div>
      </div>
      <div className="splash-copy">
        <p className="splash-noise">bahaahaahahahaha.....</p>
        <h1>Shiloh Ridge Farm</h1>
        <p>Integrity is the Backbone, Honesty the Muscle</p>
        <button type="button" onClick={enterSite}>
          Enter
        </button>
      </div>
    </div>
  );
}
