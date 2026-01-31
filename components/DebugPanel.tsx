# components/DebugPanel.tsx

import { useState } from 'react';
import { useAlertHistory, useGpsHistory, useZoneInteractions } from '@/hooks';

export default function DebugPanel() {
  const [expanded, setExpanded] = useState(false);

  const alertHistory = useAlertHistory();
  const gpsHistory = useGpsHistory();
  const zoneInteractions = useZoneInteractions();

  const stats = {
    totalAlerts: alertHistory.alerts.length,
    alertsInZone: alertHistory.getAlertsInZone(),
    approachAlerts: alertHistory.getApproachAlerts(),
    insideZoneAlerts: alertHistory.alerts.filter(a => a.type === 'inside_zone'),
    totalGpsPositions: gpsHistory.positions.length,
    positionsInZone: gpsHistory.getPositionsInZone(),
    totalInteractions: zoneInteractions.interactions.length,
    zoneTaps: zoneInteractions.getTapCountByZone('Area C'),
  };

  const handleCopyAlerts = useCallback(() => {
    const dataStr = JSON.stringify(alertHistory.alerts, null, 2);
    navigator.clipboard.writeText(dataStr);
    alert(`✅ ${alertHistory.alerts.length} alerts copied to clipboard`);
  }, [alertHistory.alerts]);

  const handleCopyGps = useCallback(() => {
    const dataStr = JSON.stringify(gpsHistory.positions, null, 2);
    navigator.clipboard.writeText(dataStr);
    alert(`✅ ${gpsHistory.positions.length} GPS positions copied to clipboard`);
  }, [gpsHistory.positions]);

  const handleCopyInteractions = useCallback(() => {
    const dataStr = JSON.stringify(zoneInteractions.interactions, null, 2);
    navigator.clipboard.writeText(dataStr);
    alert(`✅ ${zoneInteractions.interactions.length} zone interactions copied to clipboard`);
  }, [zoneInteractions.interactions]);

  const handleClearAll = useCallback(() => {
    if (confirm('Clear all alert history, GPS history, and zone interactions?')) {
      alertHistory.clearAlerts();
      gpsHistory.clearPositions();
      zoneInteractions.clearInteractions();
      localStorage.removeItem('ztl-alert-history');
      localStorage.removeItem('ztl-gps-history');
      localStorage.removeItem('ztl-zones-entered');
      localStorage.removeItem('ztl-zone-interactions');
      alert('✅ All history cleared!');
    }
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl z-[10001] max-w-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-between items-center p-3 bg-white/90 hover:bg-white/80 rounded-t border border-gray-300 cursor-pointer"
      >
        <span className="text-sm font-bold text-gray-900">📊 DEBUG PANEL</span>
        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Alert Stats */}
          <div className="bg-white/95 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">📊 Alert Statistics</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-2xl font-bold text-blue-700">{stats.totalAlerts}</p>
                <p className="text-sm text-gray-600">Total alerts</p>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <p className="text-2xl font-bold text-orange-700">{stats.alertsInZone}</p>
                <p className="text-sm text-gray-600">In zone</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-2xl font-bold text-green-700">{stats.approachAlerts}</p>
                <p className="text-sm text-gray-600">Approaching</p>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white/95 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900">📋 Recent Alerts (Last 10)</h3>
              <button
                onClick={handleCopyAlerts}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                📋 Copy Alerts
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {alertHistory.alerts.slice(-10).reverse().map((alert, i) => (
                <div key={alert.id} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-gray-200">
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
                onClick={handleCopyGps}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                📍 Copy Positions
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {gpsHistory.positions.slice(-20).reverse().map((pos, i) => (
                <div key={pos.id} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-gray-200">
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
                onClick={handleCopyInteractions}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                🎯 Copy Interactions
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {zoneInteractions.interactions.slice(-10).reverse().map((interaction, i) => (
                <div key={interaction.id} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-gray-200">
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
                <p className="text-2xl font-bold text-blue-700">{stats.totalAlerts}</p>
                <p className="text-sm text-blue-600">Alerts fired</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.totalGpsPositions}</p>
                <p className="text-sm text-blue-600">GPS positions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.totalInteractions}</p>
                <p className="text-sm text-blue-600">Zone interactions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.positionsInZone}</p>
                <p className="text-sm text-blue-600">Time in zones</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-red-100 text-white rounded text-sm hover:bg-red-200 transition"
            >
              🗑️ Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
