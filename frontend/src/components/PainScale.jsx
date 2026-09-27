function getColor(value) {
  if (value <= 3) return '#2f7a78';
  if (value <= 6) return '#c98a2e';
  return '#d6553f';
}

function PainScale({ value, onChange }) {
  const safeValue = Math.min(10, Math.max(1, Number(value) || 1));
  const progress = ((safeValue - 1) / 9) * 100;
  const color = getColor(safeValue);

  return (
    <div className="pain-scale">
      <p className="headmap-title" id="pain-scale-label">
        قيّم شدة الألم
      </p>

      <div className="pain-scale-row">
        <span
          className="pain-face happy"
          aria-hidden="true"
        >
          🙂
        </span>

        <div className="pain-track-wrapper">
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={safeValue}
            onChange={(event) =>
              onChange(Number(event.target.value))
            }
            className="pain-slider"
            aria-labelledby="pain-scale-label"
            aria-valuemin="1"
            aria-valuemax="10"
            aria-valuenow={safeValue}
            aria-valuetext={`${safeValue} من 10`}
            style={{
              background: `linear-gradient(
                to left,
                ${color} ${progress}%,
                #dbe3e6 ${progress}%
              )`,
            }}
          />

          <div
            className="pain-numbers"
            aria-hidden="true"
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map(
              (number) => (
                <span
                  key={number}
                  className={
                    number === safeValue ? 'active-num' : ''
                  }
                >
                  {number}
                </span>
              )
            )}
          </div>
        </div>

        <span
          className="pain-face sad"
          aria-hidden="true"
        >
          😣
        </span>
      </div>

      <div
        className="pain-current-value"
        style={{ color }}
        aria-live="polite"
      >
        {safeValue} / 10
      </div>
    </div>
  );
}

export default PainScale;