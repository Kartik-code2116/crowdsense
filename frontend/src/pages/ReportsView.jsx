import React, { useState, useMemo } from 'react';
import { useCrowdStore } from '../store/useCrowdStore';
import {
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Layers,
  Activity,
  FileText,
  RefreshCw,
  Search,
  Award,
  FileSpreadsheet
} from 'lucide-react';

export default function ReportsView() {
  const { zones, cameras, incidents, detectionLog, user, fetchLiveData } = useCrowdStore();

  const [activeTab, setActiveTab] = useState('density_audit'); // 'density_audit' | 'incidents_audit' | 'certificate'
  const [selectedRange, setSelectedRange] = useState('shift'); // 'shift' | '24h' | '7d' | '30d'
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'safe' | 'warning' | 'critical'
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  // Build this report from stored observations only; the date filters never invent samples.
  const auditRecords = useMemo(() => {
    const duration = { shift: 8, '24h': 24, '7d': 168, '30d': 720 }[selectedRange] * 60 * 60 * 1000;
    const cutoff = Date.now() - duration;
    return (detectionLog || []).filter((entry) => Number(entry.timestamp) >= cutoff).map((entry, index) => {
      const zone = zones.find((item) => item.id === entry.zoneId);
      const camera = cameras.find((item) => item.id === entry.cameraId);
      const maxCapacity = Number(entry.capacity || zone?.maxCapacity) || 0;
      const count = Number(entry.zoneCount ?? entry.count) || 0;
      const occupancyPct = maxCapacity ? Math.round((count / maxCapacity) * 100) : 0;
      const status = occupancyPct >= (zone?.criticalPct || 85) ? 'critical' : occupancyPct >= (zone?.warningPct || 70) ? 'warning' : 'safe';
      const date = new Date(Number(entry.timestamp));
      const statusLabel = status === 'critical' ? 'Critical threshold' : status === 'warning' ? 'Warning threshold' : 'Within configured limits';
      return {
        id: entry.id || `scan-${entry.timestamp}-${index}`,
        timestamp: date.toISOString(),
        timeOnly: date.toLocaleTimeString(),
        dateOnly: date.toLocaleDateString(),
        intervalLabel: 'Observed camera scan',
        zoneId: entry.zoneId,
        zoneName: entry.zoneName || zone?.name || 'Unknown zone',
        zoneCode: zone?.code || '—',
        floor: zone?.floor || '—',
        cameraId: entry.cameraId || '—',
        cameraName: camera?.name || entry.cameraId || 'Unknown camera',
        count,
        maxCapacity,
        occupancyPct,
        status,
        statusLabel,
        statusBadgeClass: status,
        modelUsed: entry.modelName || 'Unknown model'
      };
    }).reverse();
  }, [zones, cameras, detectionLog, selectedRange]);

  // Filter records based on UI selections
  const filteredRecords = useMemo(() => {
    return auditRecords.filter((rec) => {
      const matchZone = selectedZone === 'all' || rec.zoneId === selectedZone;
      const matchStatus = selectedStatus === 'all' || rec.status === selectedStatus;
      return matchZone && matchStatus;
    });
  }, [auditRecords, selectedZone, selectedStatus]);

  // Aggregate KPI summary metrics dynamically
  const kpis = useMemo(() => {
    if (!filteredRecords.length) {
      return { samples: 0, peakCrowd: 0, peakZone: '—', breaches: 0, warnings: 0 };
    }

    const counts = filteredRecords.map(r => r.count);
    const peakCrowd = Math.max(...counts);
    const peakRec = filteredRecords.find(r => r.count === peakCrowd) || filteredRecords[0];
    const breaches = filteredRecords.filter(r => r.status === 'critical').length;
    const warnings = filteredRecords.filter(r => r.status === 'warning').length;

    return {
      samples: filteredRecords.length,
      peakCrowd,
      peakZone: `${peakRec.zoneName} (${peakRec.occupancyPct}%)`,
      breaches,
      warnings
    };
  }, [filteredRecords]);

  // Export filtered audit data as genuine CSV
  const handleDownloadCSV = () => {
    const headers = [
      'Detection_ID',
      'Timestamp',
      'Venue_Zone',
      'Zone_Code',
      'Camera_ID',
      'Camera_Name',
      'Observed_Zone_Count',
      'Capacity_Ceiling',
      'Occupancy_Pct',
      'Capacity_Threshold_Status',
      'Deep_Learning_Model',
      'Threshold_Status'
    ];

    const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredRecords.map((r) => [
      r.id,
      r.timestamp,
      r.zoneName,
      r.zoneCode,
      r.cameraId,
      r.cameraName,
      r.count,
      r.maxCapacity,
      `${r.occupancyPct}%`,
      r.statusLabel,
      r.modelUsed,
      r.statusLabel
    ].map(cell));

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crowdsense_safety_audit_${selectedRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(encodedUri), 0);
  };

  const handleRefresh = () => {
    setLastRefreshed(new Date().toLocaleTimeString());
    fetchLiveData();
  };

  return (
    <div className="reports-view-container">
      {/* Print-Only Header Block */}
      <div className="print-only-dossier-header">
        <div className="print-brand-bar">
          <div>
            <h1>CROWDSENSE SAFETY INTELLIGENCE PLATFORM</h1>
            <h2>OBSERVED CROWD DETECTION REPORT</h2>
          </div>
          <div className="print-meta-right">
            <b>REPORT REF: CS-{Date.now().toString().slice(-6)}</b>
            <small>Generated: {new Date().toLocaleString()}</small>
            <small>Generated by: {user ? `${user.name} (${user.role})` : 'CrowdSense operator'}</small>
          </div>
        </div>
        <div className="print-divider-line" />
      </div>

      {/* Screen Page Header & Action Bar */}
      <div className="page-action-row no-print">
        <div>
          <h2>Detection reports</h2>
          <p>Review recorded camera observations, capacity thresholds, and incident history.</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={handleRefresh} title="Sync with latest time-series records">
            <RefreshCw size={14} /> Refresh Logs
          </button>
          <button className="button secondary" onClick={handleDownloadCSV} title="Export filtered records as CSV">
            <Download size={14} /> Export CSV Data
          </button>
          <button className="button primary" onClick={() => window.print()} title="Print or save this report as PDF">
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Report Sub-Navigation Tabs */}
      <div className="report-tabs-bar no-print">
        <button
          className={`report-tab-btn ${activeTab === 'density_audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('density_audit')}
        >
          <FileSpreadsheet size={15} />
          <span>Spatial Density Audit Log</span>
          <span className="tab-pill-badge">{filteredRecords.length}</span>
        </button>

        <button
          className={`report-tab-btn ${activeTab === 'incidents_audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents_audit')}
        >
          <AlertTriangle size={15} />
          <span>Safety Incidents & Alarm Trail</span>
          <span className="tab-pill-badge">{incidents.length}</span>
        </button>

        <button
          className={`report-tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
          onClick={() => setActiveTab('certificate')}
        >
          <Award size={15} />
          <span>Project summary</span>
          <span className="tab-pill-badge">Overview</span>
        </button>
      </div>

      {/* Executive KPI Summary Cards */}
      <div className="stat-grid" style={{ marginTop: '16px' }}>
        <div className="stat-card">
          <div className="stat-top">
            <span>RECORDED DETECTIONS</span>
            <Users size={16} className="stat-icon-lucide blue" />
          </div>
          <div className="stat-value">{kpis.samples.toLocaleString()}</div>
          <div className="stat-foot">Scans in selected date range</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>PEAK OBSERVED ZONE COUNT</span>
            <Activity size={16} className="stat-icon-lucide amber" />
          </div>
          <div className="stat-value text-amber">{kpis.peakCrowd.toLocaleString()}</div>
          <div className="stat-foot">Peak: {kpis.peakZone}</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>WARNING READINGS</span>
            <ShieldCheck size={16} className="stat-icon-lucide amber" />
          </div>
          <div className="stat-value text-amber">{kpis.warnings}</div>
          <div className="stat-foot">At or above each zone’s warning limit</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>CRITICAL CAPACITY SURGES</span>
            <AlertTriangle size={16} className={`stat-icon-lucide ${kpis.breaches > 0 ? 'red' : 'green'}`} />
          </div>
          <div className={`stat-value ${kpis.breaches > 0 ? 'text-red' : ''}`}>
            {kpis.breaches} <small>{kpis.breaches === 1 ? 'Reading' : 'Readings'}</small>
          </div>
          <div className="stat-foot">At or above each zone’s critical limit</div>
        </div>
      </div>

      {/* TAB 1: SPATIAL DENSITY AUDIT LOG TABLE */}
      {activeTab === 'density_audit' && (
        <div className="panel report-main-panel" style={{ marginTop: '16px' }}>
          {/* Filter Bar */}
          <div className="report-filter-bar no-print">
            <div className="filter-group">
              <label>Shift / Date Range:</label>
              <select value={selectedRange} onChange={(e) => setSelectedRange(e.target.value)}>
                <option value="shift">Current Shift (Last 8 Hours)</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Past 7 Days (Weekly Safety Audit)</option>
                <option value="30d">Past 30 Days (Monthly Fire Code Audit)</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Filter By Zone:</label>
              <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}>
                <option value="all">All Venue Zones (Comprehensive)</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.code || 'ZONE'})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
          <label>Capacity Threshold:</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="all">All Status Levels</option>
                <option value="safe">Below warning threshold</option>
                <option value="warning">Warning threshold</option>
                <option value="critical">Critical threshold</option>
              </select>
            </div>

            <div className="compliance-tag">
              <span className={`status-dot ${kpis.breaches > 0 ? 'amber' : 'green'}`} />
              <span>
                Readings:{' '}
                <b>{kpis.breaches} critical · {kpis.warnings} warning</b>
              </span>
            </div>
          </div>

          {/* Table Header Details */}
          <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', padding: '16px 20px' }}>
            <div>
              <h2>Observed detection log ({filteredRecords.length} records)</h2>
              <p>Recorded camera estimates compared with each zone’s configured capacity and thresholds.</p>
            </div>
            <div className="no-print" style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={13} />
              <span>Synced: {lastRefreshed}</span>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="custom-table report-audit-table">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>VENUE ZONE</th>
                  <th>ACTIVE CAMERA</th>
                  <th>OBSERVED ZONE COUNT</th>
                  <th>CAPACITY CEILING</th>
                  <th>OCCUPANCY</th>
                  <th>MODEL ENGINE</th>
                  <th>THRESHOLD RESULT</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className={r.status === 'critical' ? 'critical-row' : ''}>
                      <td>
                        <b>{r.timeOnly}</b>
                        <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>{r.dateOnly}</small>
                      </td>
                      <td>
                        <strong>{r.zoneName}</strong>
                        <span className="zone-code-tag">{r.zoneCode}</span>
                      </td>
                      <td>
                        <span>{r.cameraName}</span>
                        <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>ID: {r.cameraId}</small>
                      </td>
                      <td>
                        <b style={{ fontSize: '14px' }}>{r.count}</b>
                      </td>
                      <td>{r.maxCapacity}</td>
                      <td>
                        <span className={`badge-pill ${r.statusBadgeClass}`}>
                          {r.occupancyPct}% ({r.status === 'critical' ? 'Critical' : r.status === 'warning' ? 'Warning' : 'Safe'})
                        </span>
                      </td>
                      <td>
                        <span className="model-chip-tag">{r.modelUsed}</span>
                      </td>
                      <td>
                        <span className="egress-cell-text">{r.statusLabel}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      No audit records match the selected filters.
                      <button
                        className="button secondary"
                        style={{ marginLeft: '12px', fontSize: '12px' }}
                        onClick={() => { setSelectedZone('all'); setSelectedStatus('all'); }}
                      >
                        Reset Filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENTS & ALARM TRAIL TABLE */}
      {activeTab === 'incidents_audit' && (
        <div className="panel report-main-panel" style={{ marginTop: '16px' }}>
          <div className="panel-heading" style={{ borderBottom: '1px solid var(--line)', padding: '16px 20px' }}>
            <div>
              <h2>Forensic Safety Incidents & Operator Alarm Log ({incidents.length} Events)</h2>
              <p>Incident records created when a zone’s combined camera estimate crosses its configured warning threshold.</p>
            </div>
            <div className="no-print" style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Total Resolved: {incidents.filter(i => i.status === 'Resolved').length} / {incidents.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table report-audit-table">
              <thead>
                <tr>
                  <th>INCIDENT ID</th>
                  <th>TIME LOGGED</th>
                  <th>LOCATION / ZONE</th>
                  <th>SEVERITY LEVEL</th>
                  <th>PEAK HEADCOUNT</th>
                  <th>RESOLUTION STATUS</th>
                  <th>OPERATOR NOTES & MITIGATION</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length > 0 ? (
                  incidents.map((inc) => (
                    <tr key={inc.id}>
                      <td>
                        <code style={{ fontWeight: '700', color: 'var(--primary)' }}>#{String(inc.id).slice(-6)}</code>
                      </td>
                      <td>{inc.time}</td>
                      <td>
                        <b>{inc.location}</b>
                      </td>
                      <td>
                        <span className={`badge-pill ${inc.level === 'Critical' ? 'critical' : 'warning'}`}>
                          {inc.level || 'Warning'}
                        </span>
                      </td>
                      <td>
                        <b>{inc.count ?? 0}</b> / {inc.capacity || 200}
                      </td>
                      <td>
                        <span className={`status-dot ${inc.status === 'Resolved' ? 'green' : 'red'}`} style={{ marginRight: '6px' }} />
                        <b>{inc.status || 'Resolved'}</b>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>
                          {inc.notes || inc.title || 'Automated safety alert acknowledged by control room.'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      No incidents are recorded for this account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REGULATORY COMPLIANCE CERTIFICATE */}
      {activeTab === 'certificate' && (
        <div className="panel certificate-dossier-card" style={{ marginTop: '16px' }}>
          <div className="certificate-inner">
            <div className="certificate-header">
              <div className="cert-seal">
                <ShieldCheck size={36} color="#159b6f" />
              </div>
              <div className="cert-title-block">
                <span className="cert-eyebrow">PROJECT CONFIGURATION SUMMARY</span>
                <h2>CrowdSense overview</h2>
                <p>This report summarizes recorded model output and configured capacity alerts. It does not certify legal or fire-code compliance.</p>
              </div>
            </div>

            <div className="cert-body-grid">
              <div className="cert-spec-box">
                <span className="cert-spec-title">PRIMARY MONITORING ALGORITHM</span>
                <strong>CSRNet Dilated Convolutional Neural Network</strong>
                <small>ImageNet VGG-16 Frontend + 6 Dilated Conv Layers (Dilation r=2)</small>
              </div>

              <div className="cert-spec-box">
                <span className="cert-spec-title">MODEL OUTPUTS</span>
                <strong>CSRNet density estimate · YOLOv8 person boxes</strong>
                <small>CSRNet sums a density map; YOLOv8 returns individual person detections. Results need validation on labeled venue footage.</small>
              </div>

              <div className="cert-spec-box">
                <span className="cert-spec-title">FORECAST METHOD</span>
                <strong>Time-aware linear trend baseline</strong>
                <small>A trained LSTM checkpoint is not currently connected to inference.</small>
              </div>

              <div className="cert-spec-box">
                <span className="cert-spec-title">CURRENT CONFIGURATION</span>
                <strong>{zones.length} zones · {cameras.length} cameras · {incidents.length} incidents</strong>
                <small>Threshold alerts are estimates. Overlapping camera views can count some people more than once.</small>
              </div>
            </div>

            <div className="cert-signatures-row">
              <div className="cert-sign-block">
                <div className="sign-line" />
                <b>{user?.name || 'CrowdSense operator'}</b>
                <small>Report generated by</small>
              </div>

              <div className="cert-sign-block">
                <div className="sign-line" />
                <b>{kpis.samples} observations</b>
                <small>In selected date range</small>
              </div>

              <div className="cert-sign-block">
                <div className="sign-line" />
                <b>{new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</b>
                <small>Report date</small>
              </div>
            </div>

            <div className="cert-footer-notice no-print">
              <p>
                Click <b>Print / Save as PDF</b> to export this observational project summary.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
