# components/ExportButton.tsx

import { useAlertHistory, useGpsHistory } from '@/hooks';
import { useState } from 'react';

export default function ExportButton() {
  const { alerts, alertCount } = useAlertHistory();
  const { positions } = useGpsHistory();
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    setExpanded(true);

    const sessionData = {
      exportDate: new Date().toISOString(),
      device: navigator.userAgent,
      appVersion: '1.0.0',
      alerts,
      alertCount,
      positions,
      stats: {
        totalAlerts: alerts.length,
        alertsInZone: alerts.filter(a => a.type === 'inside_zone').length,
        approachAlerts: alerts.filter(a => a.type.startsWith('approach')).length,
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
    setTimeout(() => {
      alert(`✅ ${alerts.length} alerts, ${positions.length} positions exported!`);
    setExporting(false);
    }, 1000);

    setTimeout(() => {
      setExpanded(false);
    }, 2000);
  }, [alerts, positions]);

  return (
    <button
      disabled={exporting}
      onClick={handleExport}
      className={`fixed top-4 right-4 z-[10003] px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition ${expanded ? 'w-48' : 'w-32'}`}
    >
      {exporting ? (
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        </svg>
      ) : (
        <>
          {expanded ? '▼' : '📤'}
          <span className="ml-1 text-xs">Export</span>
        </>
      )}
    </button>
  );
}
