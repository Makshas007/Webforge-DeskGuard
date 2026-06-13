import React from 'react';
import { getDeskStatus, getStatusConfig } from './statusColors';

// ============================================================================
// LibraryMap — Interactive SVG floor plan with 24 desks in 3 zones
// ============================================================================

// Layout constants
const DESK_W = 100;
const DESK_H = 70;
const DESK_RX = 12;
const COL_GAP = 125;
const ROW_GAP = 95;
const ZONE_GAP = 50;
const LEFT_MARGIN = 65;
const TOP_MARGIN = 80;

// Zone configuration
const ZONES = [
  { name: 'Zone A', rows: [1, 2], yBase: TOP_MARGIN },
  { name: 'Zone B', rows: [3, 4], yBase: TOP_MARGIN + 2 * ROW_GAP + ZONE_GAP },
  { name: 'Zone C', rows: [5, 6], yBase: TOP_MARGIN + 4 * ROW_GAP + 2 * ZONE_GAP },
];

function getDeskPosition(row_num, col_num) {
  const zone = ZONES.find((z) => z.rows.includes(row_num));
  if (!zone) return { x: 0, y: 0 };
  const rowInZone = row_num - zone.rows[0]; // 0 or 1
  const x = LEFT_MARGIN + (col_num - 1) * COL_GAP;
  const y = zone.yBase + rowInZone * ROW_GAP;
  return { x, y };
}

function DeskRect({ desk, isSelected, onSelect }) {
  const status = getDeskStatus(desk);
  const config = getStatusConfig(status);
  const { x, y } = getDeskPosition(desk.row_num, desk.col_num);

  return (
    <g
      className={`desk-group ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(desk)}
      role="button"
      tabIndex={0}
      aria-label={`Desk ${desk.label}, status: ${config.label}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(desk); }}
    >
      {/* Glow background for selected */}
      {isSelected && (
        <rect
          x={x - 4}
          y={y - 4}
          width={DESK_W + 8}
          height={DESK_H + 8}
          rx={DESK_RX + 4}
          ry={DESK_RX + 4}
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
          className="fade-in"
        />
      )}

      {/* Main desk rect */}
      <rect
        className={`desk-rect ${config.className}`}
        x={x}
        y={y}
        width={DESK_W}
        height={DESK_H}
        rx={DESK_RX}
        ry={DESK_RX}
      />

      {/* Desk label */}
      <text
        className="desk-label-text"
        x={x + DESK_W / 2}
        y={y + DESK_H / 2 - 6}
        dominantBaseline="middle"
      >
        {desk.label}
      </text>

      {/* Status icon */}
      <text
        className="desk-status-icon"
        x={x + DESK_W / 2}
        y={y + DESK_H / 2 + 14}
        dominantBaseline="middle"
      >
        {config.icon}
      </text>

      {/* Student name (if occupied/away) */}
      {desk.student_name && (
        <text
          x={x + DESK_W / 2}
          y={y + DESK_H + 16}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="9"
          fontFamily="var(--font-family)"
        >
          {desk.student_name.length > 12
            ? desk.student_name.slice(0, 11) + '…'
            : desk.student_name}
        </text>
      )}
    </g>
  );
}

// Decorative elements
function Decorations() {
  return (
    <g className="map-decorations">
      {/* Entrance marker */}
      <g>
        <rect x="280" y="715" width="140" height="30" rx="6" className="map-decoration" />
        <text x="350" y="735" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-family)" fontWeight="500" letterSpacing="2">
          ENTRANCE
        </text>
      </g>

      {/* Bookshelf left */}
      <g>
        <rect x="10" y="150" width="18" height="120" rx="4" className="map-decoration" />
        <rect x="10" y="380" width="18" height="120" rx="4" className="map-decoration" />
        <rect x="10" y="580" width="18" height="80" rx="4" className="map-decoration" />
      </g>

      {/* Bookshelf right */}
      <g>
        <rect x="572" y="150" width="18" height="120" rx="4" className="map-decoration" />
        <rect x="572" y="380" width="18" height="120" rx="4" className="map-decoration" />
      </g>

      {/* Plant markers */}
      <circle cx="40" cy="50" r="6" fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
      <text x="40" y="54" textAnchor="middle" fontSize="8" fill="var(--accent-green)" opacity="0.5">🌿</text>

      <circle cx="560" cy="50" r="6" fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
      <text x="560" y="54" textAnchor="middle" fontSize="8" fill="var(--accent-green)" opacity="0.5">🌿</text>

      <circle cx="40" cy="710" r="6" fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
      <text x="40" y="714" textAnchor="middle" fontSize="8" fill="var(--accent-green)" opacity="0.5">🌿</text>
    </g>
  );
}

export default function LibraryMap({ desks, selectedDesk, onSelectDesk }) {
  if (!desks || desks.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span className="loading-text">Loading floor plan…</span>
      </div>
    );
  }

  const svgHeight = 760;

  return (
    <div className="map-svg-wrapper">
      <svg
        viewBox={`0 0 600 ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect width="600" height={svgHeight} fill="var(--bg-primary)" rx="12" />

        {/* Subtle grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.02)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="600" height={svgHeight} fill="url(#grid)" rx="12" />

        {/* Floor plan border */}
        <rect
          x="4"
          y="4"
          width="592"
          height={svgHeight - 8}
          rx="10"
          fill="none"
          stroke="var(--border-glass)"
          strokeWidth="1"
        />

        {/* Decorations */}
        <Decorations />

        {/* Zone labels and dividers */}
        {ZONES.map((zone, i) => (
          <g key={zone.name}>
            <text
              className="zone-label"
              x={LEFT_MARGIN}
              y={zone.yBase - 18}
            >
              {zone.name}
            </text>
            {/* Divider line between zones */}
            {i > 0 && (
              <line
                className="zone-divider"
                x1="40"
                y1={zone.yBase - 35}
                x2="560"
                y2={zone.yBase - 35}
              />
            )}
          </g>
        ))}

        {/* Desk rectangles */}
        {desks.map((desk) => (
          <DeskRect
            key={desk.id}
            desk={desk}
            isSelected={selectedDesk?.id === desk.id}
            onSelect={onSelectDesk}
          />
        ))}
      </svg>
    </div>
  );
}
