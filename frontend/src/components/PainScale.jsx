function getColor(value) {
  if (value <= 3) return '#2f7a78';
  if (value <= 6) return '#c98a2e';
  return '#d6553f';
}

function PainScale({ value, onChange }) {
  return (
    <div className="pain-scale">
      <p className="headmap-title">قيّم شدة الألم</p>

      <div className="pain-scale-row">
        <span className="pain-face happy">🙂</span>

        <div className="pain-track-wrapper">
          <input
            type="range"
            min="1"
            max="10"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="pain-slider"
            style={{
              background: `linear-gradient(to left, ${getColor(value)} ${((value - 1) / 9) * 100}%, #dbe3e6 ${((value - 1) / 9) * 100}%)`,
            }}
          />
          <div className="pain-numbers">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <span key={n} className={n === value ? 'active-num' : ''}>
                {n}
              </span>
            ))}
          </div>
        </div>

        <span className="pain-face sad">😣</span>
      </div>

      <div className="pain-current-value" style={{ color: getColor(value) }}>
        {value} / 10
      </div>
    </div>
  );
}

export default PainScale;