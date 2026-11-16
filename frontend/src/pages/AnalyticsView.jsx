import React, { useState, useMemo, useEffect } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';

function observedCount(matches, selectedCamera) {
  if (!matches.length) return 0;
  const latestByKey = new Map();
  for (const item of matches) {
    const key = selectedCamera ? (item.cameraId || selectedCamera.id) : (item.zoneId || 'unassigned');
    const previous = latestByKey.get(key);
    if (!previous || Number(item.timestamp) >= Number(previous.timestamp)) latestByKey.set(key, item);
  }
  return [...latestByKey.values()].reduce((sum, item) => sum + (Number(selectedCamera ? item.count : (item.zoneCount ?? item.count)) || 0), 0);
}

export default function AnalyticsView() {
  const { zones, cameras, latestDetection, detectionLog, setPage, aiConnected } = useCrowdStore();
  const [timeRange, setTimeRange] = useState('24h'); // '1h' | '6h' | '24h' | '7d' | '30d'
  const [selectedCameraId, setSelectedCameraId] = useState('all');

  // Real-time dynamic clock to keep real timestamps, hours, and calendar dates continuously accurate
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 20000);
    return () => clearInterval(timer);
  }, []);

  // Selected camera or venue aggregate baseline
  const selectedCamera = useMemo(() => {
    if (selectedCameraId === 'all') return null;
    return cameras.find((c) => c.id === selectedCameraId) || null;
  }, [cameras, selectedCameraId]);

  // Dynamic live base total across active cameras / selected stream
  const baseLiveTotal = useMemo(() => {
    if (selectedCamera) return selectedCamera.count || 0;
    return zones.reduce((sum, zone) => sum + (Number(zone.currentCount) || 0), 0);
  }, [zones, selectedCamera]);

  // Filter detection log by selected camera or zone if scoped
  const relevantLog = useMemo(() => {
    if (!detectionLog || detectionLog.length === 0) return [];
    if (selectedCamera) {
      return detectionLog.filter((d) => d.cameraId === selectedCamera.id);
    }
    return detectionLog;
  }, [detectionLog, selectedCamera]);

  // True offline: AI is down AND no detection data at all
  const hasNoData = baseLiveTotal === 0 && relevantLog.length === 0;
  const isOfflineNoData = !aiConnected && hasNoData;

  // Max capacity ceiling for active scope
  const activeMaxCapacity = useMemo(() => {
    if (selectedCamera) return selectedCamera.maxCapacity || 350;
    return zones.reduce((sum, z) => sum + (z.maxCapacity || 350), 0) || 350;
  }, [selectedCamera, zones]);

  // Real-time longitudinal configuration computed from real dates, timestamps, and detection history
  const rangeConfig = useMemo(() => {
    const now = currentTime;
    const isZero = baseLiveTotal === 0 && relevantLog.length === 0;

    const fmtHM = (d) =>
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const fmtShortDate = (d) =>
      d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const fmtDayName = (d) =>
      d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    let rawPoints = [];
    let rangeLabel = '';
    let rangeTitle = '';
    let rangeSubtitle = '';
    let dateSpan = '';
    let durationMultiplier = 1.0;
    let durationUnit = 'minutes';

    // 1. PAST 60 MINUTES (10-minute real rolling windows)
    if (timeRange === '1h') {
      rangeLabel = 'PAST 60 MINUTES';
      const dStart = new Date(now.getTime() - 50 * 60000);
      dateSpan = `${fmtShortDate(now)} • ${fmtHM(dStart)} - ${fmtHM(now)}`;
      rangeTitle = 'Observed crowd counts · past 60 minutes';
      rangeSubtitle = `Recorded camera samples • ${dateSpan}`;
      durationMultiplier = 0.25;
      durationUnit = 'minutes';

      const minuteOffsets = [50, 40, 30, 20, 10, 5, 0];
      rawPoints = minuteOffsets.map((m, idx) => {
        const t = new Date(now.getTime() - m * 60000);
        const tStart = t.getTime() - (m === 0 ? 5 * 60000 : 10 * 60000);
        const tEnd = t.getTime();
        const isLatest = m === 0;

        // Check if any real detections fall in this window
        const matches = relevantLog.filter((d) => d.timestamp >= tStart && d.timestamp <= tEnd);
        const total = observedCount(matches, selectedCamera);

        return {
          label: isLatest ? `Now (${fmtHM(t)})` : fmtHM(t),
          dateTag: fmtShortDate(t),
          total,
          observed: matches.length > 0,
          rawTime: t
        };
      });
    }

    // 2. PAST 6 HOURS (1-hour real rolling buckets)
    else if (timeRange === '6h') {
      rangeLabel = 'PAST 6 HOURS';
      const dStart = new Date(now.getTime() - 6 * 3600000);
      const isStartToday = dStart.toDateString() === now.toDateString();
      dateSpan = `${isStartToday ? fmtShortDate(now) : `${fmtShortDate(dStart)} → ${fmtShortDate(now)}`} • ${fmtHM(dStart)} - ${fmtHM(now)}`;
      rangeTitle = 'Observed crowd counts · past 6 hours';
      rangeSubtitle = `Recorded camera samples • ${dateSpan}`;
      durationMultiplier = 0.65;
      durationUnit = 'minutes';

      const hoursBack = [6, 5, 4, 3, 2, 1, 0];
      rawPoints = hoursBack.map((h, idx) => {
        const t = new Date(now.getTime() - h * 3600000);
        const tStart = t.getTime() - 3600000;
        const tEnd = t.getTime();
        const isLatest = h === 0;

        const matches = relevantLog.filter((d) => d.timestamp >= tStart && d.timestamp <= tEnd);
        const total = observedCount(matches, selectedCamera);

        const isToday = t.toDateString() === now.toDateString();
        return {
          label: isLatest ? `Now (${fmtHM(t)})` : fmtHM(t),
          dateTag: isLatest ? 'Today' : (isToday ? 'Today' : 'Yesterday'),
          total,
          observed: matches.length > 0,
          rawTime: t
        };
      });
    }

    // 3. PAST 24 HOURS (Complete diurnal cycle in 3-hour real time blocks)
    else if (timeRange === '24h') {
      rangeLabel = 'PAST 24 HOURS';
      const dStart = new Date(now.getTime() - 21 * 3600000);
      dateSpan = `${fmtDayName(dStart)} ${fmtHM(dStart)} → ${fmtDayName(now)} ${fmtHM(now)}`;
      rangeTitle = 'Observed crowd counts · past 24 hours';
      rangeSubtitle = `Recorded camera samples • ${dateSpan}`;
      durationMultiplier = 1.0;
      durationUnit = 'minutes';

      const stepMs = 3 * 3600000;
      for (let i = 7; i >= 0; i--) {
        const t = new Date(now.getTime() - i * stepMs);
        const tStart = t.getTime() - stepMs;
        const tEnd = t.getTime();
        const isLatest = i === 0;

        const matches = relevantLog.filter((d) => d.timestamp >= tStart && d.timestamp <= tEnd);
        const total = observedCount(matches, selectedCamera);

        const isToday = t.toDateString() === now.toDateString();
        const dateTag = isLatest ? 'Today' : (isToday ? fmtShortDate(t) : 'Yesterday');

        rawPoints.push({
          label: isLatest ? `Now (${fmtHM(t)})` : fmtHM(t),
          dateTag,
          total,
          observed: matches.length > 0,
          rawTime: t
        });
      }
    }

    // 4. PAST 7 DAYS (Daily longitudinal footfall with real calendar dates)
    else if (timeRange === '7d') {
      rangeLabel = 'PAST 7 DAYS';
      const dStart = new Date(now.getTime() - 6 * 86400000);
      dateSpan = `${fmtDayName(dStart)} → ${fmtDayName(now)}`;
      rangeTitle = 'Observed crowd counts · past 7 days';
      rangeSubtitle = `Recorded camera samples • ${dateSpan}`;
      durationMultiplier = 5.5;
      durationUnit = 'hours';

      for (let i = 6; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 86400000);
        const tStart = new Date(t).setHours(0, 0, 0, 0);
        const tEnd = new Date(t).setHours(23, 59, 59, 999);
        const isLatest = i === 0;

        const matches = relevantLog.filter((d) => d.timestamp >= tStart && d.timestamp <= tEnd);
        const total = observedCount(matches, selectedCamera);

        const weekdayLabel = isLatest
          ? 'Today'
          : i === 1
          ? 'Yesterday'
          : t.toLocaleDateString([], { weekday: 'short' });

        rawPoints.push({
          label: weekdayLabel,
          dateTag: fmtShortDate(t),
          total,
          observed: matches.length > 0,
          rawTime: t
        });
      }
    }

    // 5. PAST 30 DAYS (Weekly aggregated blocks with real calendar date ranges)
    else if (timeRange === '30d') {
      rangeLabel = 'PAST 30 DAYS';
      const dStart = new Date(now.getTime() - 28 * 86400000);
      dateSpan = `${fmtShortDate(dStart)} to ${fmtShortDate(now)}`;
      rangeTitle = 'Observed crowd counts · past 30 days';
      rangeSubtitle = `Recorded camera samples • ${dateSpan}`;
      durationMultiplier = 22.0;
      durationUnit = 'hours';

      const weeks = [28, 21, 14, 7, 0];
      rawPoints = weeks.map((w, idx) => {
        const isLatest = w === 0;
        const tStart = new Date(now.getTime() - (w + 7) * 86400000);
        const tEnd = new Date(now.getTime() - w * 86400000);

        const matches = relevantLog.filter((d) => d.timestamp >= tStart.getTime() && d.timestamp <= tEnd.getTime());
        const total = observedCount(matches, selectedCamera);

        return {
          label: isLatest ? 'Current Wk' : `Wk ${idx + 1}`,
          dateTag: `${fmtShortDate(tStart)} - ${isLatest ? 'Today' : fmtShortDate(tEnd)}`,
          total,
          observed: matches.length > 0,
          rawTime: tEnd
        };
      });
    }

    // Use only observed occupancy deltas; camera counts do not provide true ingress/egress totals.
    const computedData = rawPoints.map((d, idx, arr) => {
      if (d.total === 0) {
        return { ...d, influx: 0, outflux: 0 };
      }

      const prevTotal = idx > 0 ? arr[idx - 1].total : 0;
      const delta = d.total - prevTotal;

      return {
        ...d,
        influx: delta > 0 ? delta : 0,
        outflux: delta < 0 ? Math.abs(delta) : 0
      };
    });

    const sumIn = computedData.reduce((acc, d) => acc + d.influx, 0);
    const sumOut = computedData.reduce((acc, d) => acc + d.outflux, 0);
    let peak = computedData[0] || { label: '—', total: 0 };
    computedData.forEach((d) => {
      if (d.total > peak.total) peak = d;
    });

    const summary = {
      netTurnover: isZero
        ? '0 Increase / 0 Decrease'
        : `+${sumIn.toLocaleString()} Occupancy / -${sumOut.toLocaleString()} Occupancy`,
      peakWindow: isZero
        ? 'Awaiting Data (0 Count)'
        : `${peak.label} (${peak.total.toLocaleString()} ${peak.total === 1 ? 'person' : 'people'})`,
      meanVelocity: (() => {
        const samples = relevantLog.map((entry) => entry.flow?.average_speed_px_per_frame).filter(Number.isFinite);
        return samples.length ? `${(samples.reduce((sum, value) => sum + value, 0) / samples.length).toFixed(2)} px/frame` : 'Unavailable (no motion samples)';
      })(),
      samplingRate:
        timeRange === '1h'
          ? '10-Minute Granularity'
          : timeRange === '6h'
          ? '1-Hour Rolling Buckets'
          : timeRange === '24h'
          ? '3-Hour Aggregate Intervals'
          : timeRange === '7d'
          ? 'Daily Cumulative Integration'
          : 'Weekly Block Aggregation'
    };

    return {
      rangeKey: timeRange,
      label: rangeLabel,
      title: rangeTitle,
      subtitle: rangeSubtitle,
      dateSpan,
      data: computedData,
      summary,
      durationMultiplier,
      durationUnit
    };
  }, [timeRange, baseLiveTotal, relevantLog, currentTime]);

  const currentRange = rangeConfig;
  const chartData = currentRange.data;

  // Maximum total value across current data to properly scale bars
  const maxTotal = useMemo(() => {
    return Math.max(10, ...chartData.map((d) => d.total || 0)) * 1.2;
  }, [chartData]);

  return (
    <div className="analytics-container">
      {/* Offline / No-Data Banner — prominent when AI is down and no data exists */}
      {isOfflineNoData && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            background: 'linear-gradient(90deg, rgba(224, 85, 85, 0.12), rgba(219, 146, 37, 0.07))',
            border: '1px solid #e05555',
            borderRadius: '8px',
            padding: '14px 18px',
            marginBottom: '16px'
          }}
        >
          <span style={{ fontSize: '22px' }}>⚠</span>
          <div>
            <b style={{ color: '#e05555', fontSize: '14px' }}>No detection data · AI service offline</b>
            <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '4px 0 0', lineHeight: '1.5' }}>
              No saved readings are available, and the AI service has not reported a loaded model. Start the services and run a camera scan to begin collecting observations.
            </p>
          </div>
          <button
            className="button primary"
            style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => setPage('Crowd search')}
          >
            🔍 Open Crowd Search →
          </button>
        </div>
      )}

      {/* Live AI Detection Telemetry Summary */}
      {latestDetection && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(90deg, rgba(39, 109, 224, 0.12), rgba(25, 167, 121, 0.08))',
            border: '1px solid #276de0',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '16px',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <span
              className="live-pill"
              style={{ background: '#276de0', color: '#fff', borderColor: '#276de0', fontWeight: '800' }}
            >
              Latest recorded observation
            </span>
            <div style={{ marginTop: '4px', fontSize: '13px' }}>
              Latest scan: <b>{latestDetection.count} {latestDetection.count === 1 ? 'person' : 'people'}</b> in{' '}
              <b>{latestDetection.zoneName || 'Zone'}</b>
              {Number(latestDetection.latencyMs) > 0 && <> ({latestDetection.latencyMs} ms measured inference time)</>}
              {latestDetection.time && (
                <span style={{ color: 'var(--muted)', marginLeft: '6px' }}>at {latestDetection.time}</span>
              )}
            </div>
          </div>
          <button
            className="button primary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={() => setPage('Crowd search')}
          >
            🔍 Run New Crowd Scan →
          </button>
        </div>
      )}

      {/* Analytics Filter Header with Functional Range Buttons & Real Stream Filter */}
      <div
        className="analytics-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
              <h2>Observed Occupancy History</h2>
          <p>
            {hasNoData
              ? 'Run a camera scan to start building a real detection history.'
              : 'Time buckets show the latest recorded count for each selected camera or zone.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.3px' }}>
              STREAM / CAMERA:
            </span>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              style={{
                height: '32px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '12px',
                fontWeight: '600'
              }}
              aria-label="Filter longitudinal stream"
            >
              <option value="all">
                All Cameras ({cameras.length} configured · {baseLiveTotal} people)
              </option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}: {c.name} · {c.count} people ({c.capacity}%)
                </option>
              ))}
            </select>
          </div>

          <div className="range-pills" role="tablist" aria-label="Select longitudinal time range">
            {['1h', '6h', '24h', '7d', '30d'].map((r) => (
              <button
                key={r}
                className={`pill-btn ${timeRange === r ? 'active' : ''}`}
                onClick={() => setTimeRange(r)}
                role="tab"
                aria-selected={timeRange === r}
                title={`View ${r.toUpperCase()} time-series`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Range Metadata & Summary KPIs Ribbon */}
      <div className="analytics-kpi-ribbon">
        <div className="analytics-kpi-item">
          <small>CURRENT TIME RANGE</small>
          <b style={{ color: '#276de0' }}>{currentRange.label}</b>
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>
            {currentRange.dateSpan}
          </span>
        </div>
        <div className="analytics-kpi-item">
          <small>MONITORED CAMERA SCOPE</small>
          <b style={{ color: 'var(--text)' }}>
            {selectedCamera ? `${selectedCamera.id} · ${selectedCamera.name}` : `All Cameras (${cameras.length} configured)`}
          </b>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            {selectedCamera ? `${selectedCamera.zone}` : 'Venue-wide integration'}
          </span>
        </div>
        <div className="analytics-kpi-item">
          <small>COUNT CHANGE IN RANGE</small>
          <b>{hasNoData ? '—' : currentRange.summary.netTurnover}</b>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Change between observed samples</span>
        </div>
        <div className="analytics-kpi-item">
          <small>PEAK OBSERVED INTERVAL</small>
          <b className={isOfflineNoData ? '' : 'text-amber'}>
            {hasNoData ? '—' : currentRange.summary.peakWindow}
          </b>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Highest observed count in this range</span>
        </div>
        <div className="analytics-kpi-item">
          <small>MEAN IMAGE MOTION</small>
          <b className={isOfflineNoData ? '' : 'text-green'}>
            {hasNoData ? '—' : currentRange.summary.meanVelocity}
          </b>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Pixels per frame; not people-per-second flow</span>
        </div>
      </div>

          {/* Observed occupancy and count changes */}
      <div className="analytics-grid" style={{ marginTop: '16px' }}>
        <section className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-heading">
            <div>
              <h2>{currentRange.title}</h2>
              <p>{currentRange.subtitle}</p>
            </div>
            <div className="chart-legend" style={{ margin: 0 }}>
              <span><i className="legend-blue" style={{ background: '#276de0' }} /> Total Occupants</span>
              <span><i className="legend-blue" style={{ background: '#159b6f' }} /> Occupancy increase</span>
              <span><i className="legend-blue" style={{ background: '#cf4b54' }} /> Occupancy decrease</span>
            </div>
          </div>

          {/* Empty state when offline and no data */}
          {!chartData.some((point) => point.observed) ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                textAlign: 'center',
                padding: '40px 24px',
                background: 'rgba(224, 85, 85, 0.04)',
                borderRadius: '8px',
                border: '1px dashed rgba(224, 85, 85, 0.25)'
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📊</div>
              <b style={{ color: 'var(--text)', fontSize: '14px' }}>No readings in this time range</b>
              <p style={{ color: 'var(--muted)', fontSize: '12px', maxWidth: '420px', margin: '8px 0 16px', lineHeight: '1.6' }}>
                Recorded scans are shown in their actual time buckets. Empty buckets are left blank rather than estimated.
              </p>
              <button
                className="button primary"
                style={{ fontSize: '12px', padding: '8px 18px' }}
                onClick={() => setPage('Crowd search')}
              >
                🔍 Run a Crowd Scan →
              </button>
            </div>
          ) : (
            <div className="bar-chart-container">
              {chartData.map((d, idx) => {
                const barHeightPct = Math.min(
                  100,
                  Math.max(d.total > 0 ? 8 : 0, (d.total / maxTotal) * 100)
                );
                const isSurge = d.total > 260;
                const isElevated = d.total > 200;
                const barColor = isSurge ? '#cf4b54' : isElevated ? '#cc841b' : '#276de0';

                return (
                  <div key={idx} className="bar-col">
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${barHeightPct}%`,
                          background: barColor
                        }}
                        title={`${d.label} (${d.dateTag}): ${d.total.toLocaleString()} observed occupants (+${d.influx} / -${d.outflux} count change)`}
                      />
                    </div>
                    <div className="bar-sub-values">
                      {d.influx > 0 ? (
                        <span className="text-green">+{d.influx}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)', opacity: 0.4 }}>0</span>
                      )}
                      {d.outflux > 0 ? (
                        <span className="text-red">-{d.outflux}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)', opacity: 0.4 }}>0</span>
                      )}
                    </div>
                    <span className="bar-label">{d.label}</span>
                    {d.dateTag && (
                      <span className="bar-date-tag">
                        {d.dateTag}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Zone Distribution Breakdown */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Zone Density Share</h2>
              <p>Relative distribution across venue zones</p>
            </div>
          </div>

          {hasNoData ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏢</div>
              <b style={{ color: '#e05555', display: 'block', marginBottom: '4px' }}>No zone data</b>
              Create zones, connect cameras, and collect readings to populate occupancy data.
            </div>
          ) : (
            <div className="zone-share-list">
              {zones.map((z) => {
                const count = Number(z.currentCount) || 0;
                const maxCap = z.maxCapacity || 350;
                const pct = Math.min(100, Math.round((count / maxCap) * 100));
                const precisePct = ((count / maxCap) * 100).toFixed(1);
                const statusClass =
                  pct >= (z.criticalPct || 85)
                    ? 'critical'
                    : pct >= (z.warningPct || 70)
                    ? 'warning'
                    : 'normal';

                return (
                  <div key={z.id} className="share-row">
                    <div className="share-meta">
                      <div className="share-meta-left">
                        <b style={{ fontSize: '13.5px', color: 'var(--text)' }}>{z.name}</b>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--muted)',
                            background: 'var(--surface)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: '1px solid var(--line)',
                            fontWeight: '600'
                          }}
                        >
                          {z.code || 'ZONE'}
                        </span>
                      </div>
                      <div className="share-meta-right">
                        <b style={{ fontSize: '13px', color: 'var(--text)' }}>
                          {count} {count === 1 ? 'person' : 'people'}
                        </b>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          ({pct > 0 ? `${pct}%` : `${precisePct}%`} of {maxCap})
                        </span>
                        <span
                          className={`incident-status ${
                            statusClass === 'critical'
                              ? 'red'
                              : statusClass === 'warning'
                              ? 'amber'
                              : 'green'
                          }`}
                          style={{ fontSize: '10.5px', padding: '2px 8px' }}
                        >
                          {statusClass === 'critical'
                            ? 'Critical'
                            : statusClass === 'warning'
                            ? 'Warning'
                            : 'Normal'}
                        </span>
                      </div>
                    </div>

                    <div className="progress-track" style={{ height: '7px', margin: '4px 0 6px' }}>
                      <div
                        className={`progress-fill ${statusClass}`}
                        style={{
                          width: `${Math.min(100, Math.max(count > 0 ? 3 : 0, pct))}%`
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: 'var(--muted)'
                      }}
                    >
                      <span>
                        Floor: {z.floor || 'Level 1 Ingress'} • {z.egressCount || 2} Egress Corridors
                      </span>
                      <span>
                        Ceiling: {maxCap} • Warning &gt; {z.warningPct || 70}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Current capacity status by zone */}
      <section className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading">
          <div>
            <h2>Zone capacity status</h2>
            <p>Latest camera-derived estimate compared with each zone’s configured limits.</p>
          </div>
          <span className="badge-pill">Camera counts only</span>
        </div>

        {hasNoData ? (
          <div style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            <span style={{ fontWeight: '700', fontSize: '14px' }}>No zone readings</span>
            <p style={{ margin: '6px 0 0', fontSize: '12px' }}>
              Collect camera readings to compare occupancy against configured zone limits.
            </p>
          </div>
        ) : (
          <div className="incident-table">
            <div className="table-head">
              <span>ZONE</span>
              <span>LATEST MODEL SAMPLE</span>
              <span>CURRENT OCCUPANCY</span>
              <span>CAMERA COVERAGE</span>
              <span>SAFETY STATUS</span>
            </div>

            {zones.map((zone) => {
              const count = Number(zone.currentCount) || 0;
              const maxCap = zone.maxCapacity || 350;
              const occ = Math.round((count / maxCap) * 100);
              const isCritical = occ >= (zone.criticalPct || 85);
              const isWarning = occ >= (zone.warningPct || 70);

              const statusClass = isCritical ? 'red' : isWarning ? 'amber' : 'green';
              const statusLabel = isCritical ? 'Critical capacity' : isWarning ? 'Warning threshold' : 'Within configured limits';
              const latestForZone = relevantLog.filter((entry) => entry.zoneId === zone.id).slice(-1)[0];

              return (
                <div key={zone.id} className="incident-row">
                  <b>
                    {zone.name}{' '}
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '400' }}>
                      ({zone.code || 'ZONE'})
                    </span>
                  </b>
                  <span>
                    {latestForZone?.time || 'No scan recorded'}
                  </span>
                  <span className={isCritical ? 'text-red' : isWarning ? 'text-amber' : 'text-green'}>
                    {count} {count === 1 ? 'person' : 'people'} ({occ}%)
                  </span>
                  <span>{cameras.filter((camera) => camera.zoneId === zone.id).length} configured camera(s)</span>
                  <span><em className={`incident-status ${statusClass}`}>{statusLabel}</em></span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
