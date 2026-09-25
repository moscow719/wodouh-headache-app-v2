import { useState } from 'react';

const points = [
  { id: 'forehead', label: 'الجبهة', cx: 100, cy: 55 },
  { id: 'left_temple', label: 'الصدغ الأيسر', cx: 55, cy: 90 },
  { id: 'right_temple', label: 'الصدغ الأيمن', cx: 145, cy: 90 },
  { id: 'around_eyes', label: 'حول العين', cx: 100, cy: 100 },
  { id: 'top', label: 'أعلى الرأس', cx: 100, cy: 25 },
  { id: 'back', label: 'خلف الرأس', cx: 100, cy: 150 },
];

function HeadMap({ onSelect, selectedRegion }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="headmap-wrapper">
      <p className="headmap-title">حدد المكان اللي بيوجعك</p>

      <svg viewBox="0 0 200 220" className="headmap-svg">
        {/* Simple illustrated head shape */}
        <path
          d="M100,15
             C140,15 165,50 165,95
             C165,140 145,175 130,190
             L130,205 L70,205 L70,190
             C55,175 35,140 35,95
             C35,50 60,15 100,15 Z"
          className="head-illustration"
        />
        {/* Ears */}
        <ellipse cx="35" cy="100" rx="7" ry="14" className="head-illustration" />
        <ellipse cx="165" cy="100" rx="7" ry="14" className="head-illustration" />

        {/* Face hints */}
        <circle cx="82" cy="105" r="3" className="face-detail" />
        <circle cx="118" cy="105" r="3" className="face-detail" />
        <path d="M90,135 Q100,142 110,135" className="face-detail-line" />

        {points.map((p) => (
          <circle
            key={p.id}
            cx={p.cx}
            cy={p.cy}
            r={selectedRegion === p.id ? 10 : 8}
            className={`head-point ${selectedRegion === p.id ? 'selected' : ''}`}
            onClick={() => onSelect(p.id, p.label)}
            onMouseEnter={() => setHovered(p.label)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      <p className="headmap-hint">
        {hovered || (selectedRegion ? points.find((p) => p.id === selectedRegion)?.label : 'دوس على النقطة اللي بتوجعك')}
      </p>
    </div>
  );
}

export default HeadMap;