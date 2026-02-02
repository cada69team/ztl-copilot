"use client"

import { useState, useCallback  } from "react";

interface DebugPanelProps {
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export default function DebugPanel({ expanded: controlledExpanded, onExpandChange }: DebugPanelProps = {}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // Usa expanded controllato se fornito, altrimenti usa lo stato interno
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const handleToggle = () => {
    const newExpanded = !expanded;
    if (onExpandChange) {
      onExpandChange(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  const alerts = JSON.parse(localStorage.getItem('ztl-alert-history') || '[]');
  const positions = JSON.parse(localStorage.getItem('ztl-gps-history') || '[]');
  const interactions = JSON.parse(localStorage.getItem('ztl-zone-interactions') || '[]');

  const handleClearAll = useCallback(() => {
    if (confirm('Clear all alert history, GPS history, and zone interactions?')) {
      localStorage.removeItem('ztl-alert-history');
      localStorage.removeItem('ztl-gps-history');
      localStorage.removeItem('ztl-zone-interactions');
      if (onExpandChange) {
        onExpandChange(false);
      } else {
        setInternalExpanded(false);
      }
      alert('✅ All history cleared!');
    }
  }, [onExpandChange]);


  const handleExport = useCallback(() => {
    const sessionData = {
      exportDate: new Date().toISOString(),
      device: navigator.userAgent,
      appVersion: '1.0.1',
      alerts,
      positions,
      interactions,
      stats: {
        totalAlerts: alerts.length,
        alertsInZone: alerts.filter((a: any) => a.type === 'inside_zone').length,
        totalGpsPositions: positions.length,
        totalInteractions: interactions.length,
      },
    };

    const dataStr = JSON.stringify(sessionData, null, 2);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ztl-copilot-session-${Date.now()}.json`;
    a.click();

    navigator.clipboard.writeText(dataStr);

    alert(`✅ ${alerts.length} alerts, ${positions.length} positions, ${interactions.length} interactions exported!`);
  }, [alerts, positions, interactions]);

  return (
    <div className="fixed top-4 left-4 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl z-[10001] max-w-md">
      <button
        onClick={handleToggle}
        className="w-full flex justify-between items-center p-3 bg-white/90 hover:bg-white/80 rounded-t border border-gray-300 cursor-pointer"
      >
        <span className="text-sm font-bold text-gray-900">📊 DEBUG PANEL</span>
        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="space-y-3 p-4">
          {/* Alert Stats */}
          <div className="bg-white/95 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">📊 Alert Statistics</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-2xl font-bold text-blue-700">{alerts.length}</p>
                <p className="text-sm text-gray-600">Total alerts</p>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <p className="text-2xl font-bold text-orange-700">
                  {alerts.filter((a: any) => a.type === 'inside_zone').length}
                </p>
                <p className="text-sm text-gray-600">In zone</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-2xl font-bold text-green-700">
                  {alerts.filter((a: any) => a.type === 'approach_200m' || a.type === 'approach_100m' || a.type === 'approach_50m').length}
                </p>
                <p className="text-sm text-gray-600">Approaching</p>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white/95 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900">📋 Recent Alerts (Last 10)</h3>
              <button
                onClick={() => {
                  const alertData = JSON.stringify(alerts.slice(-10).reverse(), null, 2);
                  navigator.clipboard.writeText(alertData);
                  alert(`✅ ${alerts.slice(-10).length} alerts copied to clipboard`);
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                📋 Copy Alerts
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {alerts.slice(-10).reverse().map((alert: any, i: number) => (
                <div key={i} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-gray-200 mb-2">
                  <div className="font-semibold text-gray-900 mb-1">
                    {alert.type.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="text-gray-600 mb-1">
                    {alert.city} - {alert.zone}
                  </div>
                  {alert.distance > 0 && (
                    <div className="text-blue-600 font-semibold">
                      {alert.distance.toFixed(0)}m
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GPS History */}
          <div className="bg-white/95 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900">📍 GPS History (Last 20)</h3>
              <button
                onClick={() => {
                  const gpsData = JSON.stringify(positions.slice(-20).reverse(), null, 2);
                  navigator.clipboard.writeText(gpsData);
                  alert(`✅ ${positions.slice(-20).length} GPS positions copied to clipboard`);
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                📍 Copy Positions
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {positions.slice(-20).reverse().map((pos: any, i: number) => (
                <div key={i} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-gray-200 mb-2">
                  <div className="font-semibold text-gray-900 mb-1">
                    {pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)}
                  </div>
                  <div className="text-gray-600 mb-1">
                    {pos.source === 'gps' ? '🟢 GPS' : '🔵 Network'}
                  </div>
                  <div className="text-blue-600 font-semibold">
                    Acc: {pos.accuracy ? pos.accuracy.toFixed(0) + 'm' : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(pos.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zone Interactions */}
          <div className="bg-white/95 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900">🎯 Zone Interactions (Last 10)</h3>
              <button
                onClick={() => {
                  const interactionData = JSON.stringify(interactions.slice(-10).reverse(), null, 2);
                  navigator.clipboard.writeText(interactionData);
                  alert(`✅ ${interactions.slice(-10).length} interactions copied to clipboard`);
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                🎯 Copy Interactions
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {interactions.slice(-10).reverse().map((interaction: any, i: number) => (
                <div key={i} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-gray-200 mb-2">
                  <div className="font-semibold text-gray-900 mb-1">
                    {interaction.action === 'tap' ? '👆' : interaction.action === 'view' ? '👁' : '❌'}
                    {interaction.zoneName}
                  </div>
                  <div className="text-gray-600 mb-1">
                    {new Date(interaction.timestamp).toLocaleTimeString()}
                  </div>
                  {interaction.action === 'tap' && (
                    <div className="text-xs text-blue-600">
                      Tapped on zone
                    </div>
                  )}
                  {interaction.duration > 0 && interaction.action === 'view' && (
                    <div className="text-xs text-gray-500">
                      Viewed for {interaction.duration.toFixed(0)}s
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Session Stats */}
          <div className="bg-blue-50/95 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-blue-900 mb-3">📊 Session Statistics</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-2xl font-bold text-blue-700">{alerts.length}</p>
                <p className="text-sm text-blue-600">Alerts fired</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{positions.length}</p>
                <p className="text-sm text-blue-600">GPS positions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{interactions.length}</p>
                <p className="text-sm text-blue-600">Zone interactions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">
                  {alerts.filter((a: any) => a.type === 'inside_zone').length}
                </p>
                <p className="text-sm text-blue-600">Time in zones</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
            >
              🗑️ Clear All
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
            >
              💾 Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
