import React from 'react';
import { STATUS_COLOR, STATUS_LABEL } from './statusColors';

// Renders the library as an SVG. Desk color reflects server-reported status only.
export default function LibraryMap({ desks, onSelect, selectedCode }) {
  return (
    <svg viewBox="0 0 500 440" width="100%" style={{ maxWidth: 560, border: '1px solid #ddd', borderRadius: 8 }}>
      {desks.map((d) => {
        const isSelected = d.code === selectedCode;
        return (
          <g key={d.code} onClick={() => onSelect(d)} style={{ cursor: 'pointer' }}>
            <rect
              x={d.x} y={d.y} width={80} height={70} rx={8}
              fill={STATUS_COLOR[d.status] || '#ccc'}
              stroke={isSelected ? '#1565c0' : '#333'}
              strokeWidth={isSelected ? 4 : 1}
            />
            <text x={d.x + 40} y={d.y + 32} textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">
              {d.label}
            </text>
            <text x={d.x + 40} y={d.y + 52} textAnchor="middle" fill="#fff" fontSize="11">
              {STATUS_LABEL[d.status]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
