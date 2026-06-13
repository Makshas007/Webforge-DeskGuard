import React, { useState, useCallback, useMemo } from 'react';
import { getDesks, usePolling } from './api';
import LibraryMap from './LibraryMap';
import DeskPanel from './DeskPanel';

// ============================================================================
// MapView — Main library map page with live polling and desk selection
// ============================================================================

export default function MapView() {
  const [selectedDesk, setSelectedDesk] = useState(null);

  const fetchDesks = useCallback(() => getDesks(), []);
  const { data: desks, error, loading, refresh } = usePolling(fetchDesks, 5000);

  // Keep selectedDesk in sync with latest polled data
  const currentSelectedDesk = useMemo(() => {
    if (!selectedDesk || !desks) return null;
    return desks.find((d) => d.id === selectedDesk.id) || null;
  }, [desks, selectedDesk]);

  function handleSelectDesk(desk) {
    setSelectedDesk((prev) => (prev?.id === desk.id ? null : desk));
  }

  function handleClosePanel() {
    setSelectedDesk(null);
  }

  function handleAction() {
    refresh();
  }

  // Calculate occupancy stats
  const stats = useMemo(() => {
    if (!desks) return { total: 0, occupied: 0, free: 0, away: 0 };
    return {
      total: desks.length,
      occupied: desks.filter((d) => d.status === 'occupied').length,
      free: desks.filter((d) => d.status === 'free').length,
      away: desks.filter((d) => d.status === 'away').length,
    };
  }, [desks]);

  const occupancyPct = stats.total > 0
    ? Math.round(((stats.occupied + stats.away) / stats.total) * 100)
    : 0;

  // Loading state
  if (loading && !desks) {
    return (
      <div className="library-map-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <span className="loading-text">Loading library map…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="map-view-layout">
      {/* Main map area */}
      <div className="map-view-main">
        <div className="library-map-container">
          {/* Header */}
          <div className="map-header">
            <div className="map-title">
              📍 Library Floor Plan
            </div>
            <div className="live-indicator">
              <span className="live-dot" />
              LIVE
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="error-banner mb-md">
              <span className="error-banner-icon">⚠</span>
              Connection issue — retrying… ({error})
            </div>
          )}

          {/* Legend */}
          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-swatch legend-swatch-free" />
              Free ({stats.free})
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-swatch-occupied" />
              Occupied ({stats.occupied})
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-swatch-away" />
              Away ({stats.away})
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-swatch-heartbeat" />
              Heartbeat Pending
            </div>
          </div>

          {/* Occupancy bar */}
          <div className="occupancy-bar-container">
            <div className="occupancy-bar-label">
              <span>Occupancy</span>
              <span>{occupancyPct}% ({stats.occupied + stats.away}/{stats.total})</span>
            </div>
            <div className="occupancy-bar">
              <div
                className={`occupancy-bar-fill ${occupancyPct > 75 ? 'high' : ''}`}
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
          </div>

          {/* SVG Map */}
          <LibraryMap
            desks={desks || []}
            selectedDesk={currentSelectedDesk}
            onSelectDesk={handleSelectDesk}
          />
        </div>
      </div>

      {/* Sidebar / Desk Panel */}
      <div className="map-view-sidebar">
        {currentSelectedDesk ? (
          <DeskPanel
            desk={currentSelectedDesk}
            onClose={handleClosePanel}
            onAction={handleAction}
          />
        ) : (
          <div className="desk-panel">
            <div className="map-view-no-selection">
              <div className="map-view-no-selection-icon">🪑</div>
              <div className="map-view-no-selection-text">
                Select a desk on the map to view details or check in
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
