import React, { useEffect, useState } from 'react';

const nav = [
  { label: 'OVERVIEW', items: [['Dashboard','⌂'],['Live monitor','▦'],['Analytics','⌁']] },
  { label: 'OPERATIONS', items: [['Cameras','◉'],['Zones','◇'],['Incidents','⚑'],['Reports','▤']] },
  { label: 'INTELLIGENCE', items: [['Model lab','✳'],['Settings','⚙']] },
];
const cameras = [
  { name:'North entrance', zone:'GATE A · ZONE 01', count:142, capacity:72, status:'Live', scene:'entrance' },
  { name:'Central concourse', zone:'HALL · ZONE 02', count:286, capacity:91, status:'Live', scene:'concourse' },
  { name:'East walkway', zone:'EAST · ZONE 03', count:86, capacity:43, status:'Live', scene:'walkway' },
];
const incidents = [
  { time:'14:32:08', title:'Capacity threshold exceeded', location:'Central concourse · Zone 02', level:'Critical', color:'red' },
  { time:'14:18:41', title:'Crowd density increasing', location:'North entrance · Zone 01', level:'Warning', color:'amber' },
  { time:'13:56:12', title:'Camera feed restored', location:'East walkway · Zone 03', level:'Resolved', color:'green' },
];
const menuPages = { Dashboard:'Operations overview', 'Live monitor':'Live camera monitoring', Analytics:'Crowd analytics', Cameras:'Camera management', Zones:'Zone capacity management', Incidents:'Incident center', Reports:'Reports & exports', 'Model lab':'Model performance lab', Settings:'Workspace settings' };

function Icon({ children, size=18 }) { return <span className="icon" style={{fontSize:size}} aria-hidden="true">{children}</span> }
function LineChart({ forecast=false }) {
  const a='0,78 30,71 60,73 90,57 120,62 150,45 180,52 210,37 240,44 270,28 300,36 330,18 360,24 390,11 420,16 450,4';
  return <svg className="line-chart" viewBox="0 0 460 116" preserveAspectRatio="none" role="img" aria-label="Crowd count trend chart">
    {[18,42,66,90].map(y=><line key={y} x1="0" y1={y} x2="460" y2={y} className="chart-grid"/>)}
    <polyline points={a} fill="none" className="chart-area" />
    <polyline points={a} fill="none" className="chart-line" />
    {forecast&&<polyline points="330,18 360,12 390,13 420,6 450,2" fill="none" className="forecast-line"/>}
  </svg>;
}
function CameraScene({ scene, index }) { return <div className={`scene ${scene}`}>
  <div className="scene-building building-a"/><div className="scene-building building-b"/><div className="scene-floor"/>
  <div className="scene-light light-a"/><div className="scene-light light-b"/>
  {Array.from({length:12},(_,i)=><span key={i} className={`person p${i+1}`}><i/></span>)}
  <div className="heat heat-a"/><div className="heat heat-b"/>
  <span className="camera-label">CAM-{String(index+1).padStart(2,'0')} · LIVE</span>
  <span className="scene-time">14:36:2{index}</span>
</div> }
function App() {
  const [theme,setTheme]=useState(()=>localStorage.getItem('crowdsense-theme')||'light');
  const [page,setPage]=useState('Dashboard'); const [heatmap,setHeatmap]=useState(true); const [range,setRange]=useState('Today');
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('crowdsense-theme',theme)},[theme]);
  const title=page==='Dashboard'?'Good afternoon, Operator':menuPages[page];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span/><span/><span/></div><div><b>crowd<span>sense</span></b><small>SAFETY INTELLIGENCE</small></div></div>
      <div className="workspace"><div className="workspace-icon">VC</div><div><strong>Venue Central</strong><small>Operations workspace</small></div><span className="chevron">⌄</span></div>
      <nav>{nav.map(group=><section key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(([label,icon])=><button key={label} className={`nav-item ${page===label?'active':''}`} onClick={()=>setPage(label)}><Icon>{icon}</Icon><span>{label}</span>{label==='Incidents'&&<em>3</em>}</button>)}</section>)}</nav>
      <div className="sidebar-bottom"><div className="system-card"><div className="system-heading"><span className="status-dot"/>All systems normal</div><div className="system-caption">Last checked just now</div><div className="system-metrics"><span>AI service</span><b>42 ms</b></div><div className="system-metrics"><span>Connected cameras</span><b>12 / 12</b></div></div><button className="profile"><div className="avatar">AK</div><span><b>Alex Kumar</b><small>Operations lead</small></span><span className="profile-dots">···</span></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>Venue Central</span><b>/</b><strong>{page}</strong></div><div className="top-actions"><div className="live-pill"><i/> LIVE SYSTEM</div><button className="icon-button theme-button" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label={`Switch to ${theme==='light'?'dark':'light'} theme`} title={`Switch to ${theme==='light'?'dark':'light'} theme`}>{theme==='light'?'☾':'☀'}</button><button className="icon-button notification" aria-label="Notifications">♧<i/></button><div className="top-divider"/><div className="top-avatar">AK</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">SUNDAY, OCTOBER 25, 2026 <span className="heading-dot">•</span> SHIFT 02</div><h1>{title}<span className="wave">{page==='Dashboard'?' 👋':''}</span></h1><p>{page==='Dashboard'?'Here’s what’s happening across your venue right now.':`Monitor and manage ${page.toLowerCase()} across your venue.`}</p></div><div className="heading-actions"><button className="button secondary" onClick={()=>window.print()}><Icon>↓</Icon> Export report</button><button className="button primary" onClick={()=>setPage('Cameras')}><Icon>＋</Icon> Add camera</button></div></div>
        {page==='Dashboard'?<>
          <div className="stat-grid">
            <article className="stat-card"><div className="stat-top"><span>PEOPLE IN VENUE</span><span className="stat-icon blue">♙</span></div><div className="stat-value">1,284 <span className="trend positive">↗ 8.2%</span></div><div className="stat-foot">vs. previous hour <span className="sparkline">⌁</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>ACTIVE CAMERAS</span><span className="stat-icon green">◉</span></div><div className="stat-value">12 <small>/ 12</small><span className="trend stable">All online</span></div><div className="stat-foot"><span className="mini-live"/> All feeds operational</div></article>
            <article className="stat-card"><div className="stat-top"><span>AVERAGE CAPACITY</span><span className="stat-icon amber">◴</span></div><div className="stat-value">68<span className="unit">%</span><span className="trend warning">↑ 4.1%</span></div><div className="stat-foot">Across 8 monitored zones</div></article>
            <article className="stat-card"><div className="stat-top"><span>ACTIVE INCIDENTS</span><span className="stat-icon red">⚑</span></div><div className="stat-value">03 <span className="trend critical">1 requires attention</span></div><div className="stat-foot">2 warnings · 1 critical</div></article>
          </div>
          <div className="dashboard-grid">
            <section className="panel trend-panel"><div className="panel-heading"><div><h2>People in venue</h2><p>Live occupancy across all monitored zones</p></div><select value={range} onChange={e=>setRange(e.target.value)} aria-label="Chart range"><option>Today</option><option>Last 24 hours</option><option>This week</option></select></div><div className="chart-summary"><strong>1,284</strong><span className="trend positive">↗ 8.2%</span><small>vs. previous period</small></div><div className="chart-wrap"><div className="y-labels"><span>1.5k</span><span>1.0k</span><span>500</span><span>0</span></div><LineChart forecast/><div className="x-labels"><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span><span>13:00</span><span>14:00</span><span>15:00</span></div></div><div className="chart-legend"><span><i className="legend-blue"/> Actual occupancy</span><span><i className="legend-dash"/> Forecast</span><span className="forecast-note">◷ Predicted peak at 15:20</span></div></section>
            <section className="panel zone-panel"><div className="panel-heading"><div><h2>Zone capacity</h2><p>Occupancy by monitored area</p></div><button className="text-button" onClick={()=>setPage('Zones')}>View zones <span>→</span></button></div><div className="zone-list">{[['Central concourse',91,'286 / 315','critical'],['North entrance',72,'142 / 200','warning'],['Food court',64,'192 / 300','normal'],['East walkway',43,'86 / 200','normal']].map(z=><div className="zone-row" key={z[0]}><div className="zone-name"><span className={`zone-dot ${z[3]}`}/><b>{z[0]}</b><span className={`zone-badge ${z[3]}`}>{z[1]}%</span></div><div className="progress-track"><div className={`progress-fill ${z[3]}`} style={{width:`${z[1]}%`}}/></div><small>{z[2]} people</small></div>)}</div><div className="zone-foot"><span className="status-dot amber-dot"/> 1 zone nearing capacity <button onClick={()=>setPage('Zones')}>Review zones →</button></div></section>
          </div>
          <section className="panel camera-panel"><div className="panel-heading"><div><h2>Live camera feeds <span className="feed-count">12</span></h2><p>Real-time crowd monitoring across your venue</p></div><div className="camera-actions"><button className={`toggle-chip ${heatmap?'selected':''}`} onClick={()=>setHeatmap(!heatmap)}><span className="heat-icon">▧</span> Heatmap <span className={`switch ${heatmap?'on':''}`}><i/></span></button><button className="text-button" onClick={()=>setPage('Live monitor')}>View all cameras <span>→</span></button></div></div><div className="camera-grid">{cameras.map((cam,i)=><article className="camera-card" key={cam.name}><div className="camera-visual"><CameraScene scene={cam.scene} index={i}/>{!heatmap&&<div className="heatmap-off">Heatmap hidden</div>}</div><div className="camera-info"><div><h3>{cam.name}</h3><small>{cam.zone}</small></div><span className="camera-count">{cam.count} <small>people</small></span></div><div className="camera-capacity"><div className="camera-track"><div className={`progress-fill ${cam.capacity>85?'critical':cam.capacity>70?'warning':'normal'}`} style={{width:`${cam.capacity}%`}}/></div><small>{cam.capacity}% capacity</small></div></article>)}</div></section>
          <section className="panel incident-panel"><div className="panel-heading"><div><h2>Recent incidents <span className="incident-count">3</span></h2><p>Latest events requiring operator attention</p></div><button className="text-button" onClick={()=>setPage('Incidents')}>Incident center <span>→</span></button></div><div className="incident-table"><div className="table-head"><span>TIME</span><span>INCIDENT</span><span>LOCATION</span><span>STATUS</span><span/></div>{incidents.map((item,i)=><div className="incident-row" key={item.time}><span className="incident-time">{item.time}</span><span className="incident-title"><i className={`incident-mark ${item.color}`}>{item.color==='red'?'!':item.color==='amber'?'↗':'✓'}</i><b>{item.title}</b></span><span className="incident-location">{item.location}</span><span><em className={`incident-status ${item.color}`}>{item.level}</em></span><button className="row-more" aria-label={`Open ${item.title}`} onClick={()=>setPage('Incidents')}>···</button></div>)}</div></section>
          <footer className="page-footer"><span>© 2026 CrowdSense <b>·</b> AI-powered crowd safety</span><span>Model: <b>CSRNet v1.2.0</b><b>·</b> Inference: <b>42ms</b><b>·</b> Updated just now</span></footer>
        </>:<section className="panel placeholder-panel"><div className="placeholder-icon">{page==='Cameras'?'◉':page==='Incidents'?'⚑':page==='Analytics'?'⌁':'◇'}</div><h2>{menuPages[page]}</h2><p>This workspace is ready for your {page.toLowerCase()} workflow. Connect the API service to load live venue data.</p><div className="placeholder-cards"><div><b>Service status</b><span><i className="status-dot"/> UI preview mode</span></div><div><b>Next step</b><span>Configure API connection in settings</span></div><div><b>Current model</b><span>CSRNet density estimator</span></div></div><button className="button secondary" onClick={()=>setPage('Dashboard')}>← Back to overview</button></section>}
      </div>
    </main>
  </div>;
}
export default App;
