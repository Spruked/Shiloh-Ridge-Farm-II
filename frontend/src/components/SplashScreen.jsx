import { useEffect, useState } from "react";
import "./SplashScreen.css";

const SPLASH_DURATION_MS = 4300;
const ENTER_REVEAL_MS = 0;

export default function SplashScreen({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const [showEnter, setShowEnter] = useState(true);

  useEffect(() => {
    const revealTimer = window.setTimeout(() => setShowEnter(true), ENTER_REVEAL_MS);
    const exitTimer = window.setTimeout(() => setExiting(true), SPLASH_DURATION_MS - 400);
    const doneTimer = window.setTimeout(() => onComplete?.(), SPLASH_DURATION_MS);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

  const enterNow = () => {
    window.dispatchEvent(new CustomEvent("shep-audio-unlock"));
    setExiting(true);
    window.setTimeout(() => onComplete?.(), 260);
  };

  return (
    <div className={`ridge-splash ${exiting ? "ridge-splash--exit" : ""}`} role="status" aria-label="Shiloh Ridge startup">
      <div className="ridge-splash__glow" />
      <div className="ridge-splash__ridge" aria-hidden="true">
        <svg viewBox="0 0 1200 220" preserveAspectRatio="none">
          <path d="M0 160 C130 110, 250 190, 390 130 C520 80, 640 180, 760 128 C880 82, 1010 175, 1200 116" />
        </svg>
      </div>

      <div className="ridge-splash__silhouettes" aria-hidden="true">
        <span className="sil sheep" />
        <span className="sil dog" />
        <span className="sil barn" />
        <span className="sil fence" />
      </div>

      <div className="ridge-splash__orb">
        <span className="ridge-splash__pulse" />
        <img
          src={`${process.env.PUBLIC_URL || ""}/ShilohRidgeFarmicon256.png`}
          alt="Shiloh Ridge Farm"
          className="ridge-splash__logo"
          width="210"
          height="214"
        />
      </div>

      <div className="ridge-splash__copy">
        <h1>SHILOH RIDGE</h1>
        <p>Farm Intelligence System</p>
        <button
          type="button"
          onClick={enterNow}
          className={`ridge-splash__enter ${showEnter ? "ridge-splash__enter--show" : ""}`}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
