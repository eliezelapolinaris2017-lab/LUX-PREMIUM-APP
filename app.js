51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
72
73
74
75
76
77
78
79
80
81
82
83
84
85
86
87
88
89
90
91
92
93
94
95
96
97
98
99
100
101
102
103
104
105
106
107
108
109
110
111
112
113
114
115
116
117
118
119
120
121
122
123
124
125
126
127
128
129
130
131
132
133
134
135
136
137
138
139
140
141
142
143
144
/* app.js (compacto) — Exportaciones por Técnica / Día / Mes / Año */
  const keyFn =
    mode==='tech'  ? (i)=> i.tech || '(sin técnica)' :
    mode==='day'   ? (i)=> i.date || '(sin fecha)'   :
    mode==='month' ? (i)=> (i.date? i.date.slice(0,7) : '(sin mes)') :
    mode==='year'  ? (i)=> (i.date? i.date.slice(0,4) : '(sin año)') :
    mode==='hour'  ? (i)=> (i.time ? (i.time.slice(0,2)+':00') : '(sin hora)') :
                     (i)=> '(otro)';

  const map = {};
  for (const i of list) {
    const k = keyFn(i);
    const amt = (+i.amount||0);
    (map[k] ??= { key:k, count:0, total:0 }).count++;
    map[k].total += amt;
  }
  return Object.values(map).sort((a,b)=> b.total - a.total || String(a.key).localeCompare(String(b.key)));
}

// ===== Exports =====
function exportGroupedCSV(mode, opts={}){
  const nice = ({tech:'Técnica', day:'Día', month:'Mes', year:'Año', hour:'Hora'})[mode] || mode;
  const data = groupInvoices(mode, opts);
  const rows = [[nice,'Cantidad','Total ($)']];
  data.forEach(r => rows.push([r.key, r.count, r.total.toFixed(2)]));
  const techSuffix = opts.tech && opts.tech!=='(todas)' ? `-${opts.tech.replace(/\s+/g,'_')}` : '';
  const perSuffix  = `-${(opts.period||'all')}`;
  S.download(`cobros-por-${mode}${techSuffix}${perSuffix}.csv`, S.csv(rows), 'text/csv');
}

function exportGroupedPDF(mode, opts={}){
  const nice = ({tech:'Técnica', day:'Día', month:'Mes', year:'Año', hour:'Hora'})[mode] || mode;
  const data = groupInvoices(mode, opts);
  const sumTotal = data.reduce((a,x)=>a+x.total,0);
  const sumCount = data.reduce((a,x)=>a+x.count,0);
  const rows = data.map(r=>`
    <tr>
      <td>${r.key}</td>
      <td style="text-align:right">${r.count}</td>
      <td style="text-align:right">$${r.total.toFixed(2)}</td>
    </tr>`).join('');
  const xTech = (opts.tech && opts.tech!=='(todas)') ? ` — Técnica: ${opts.tech}` : '';
  const xPer  = `Periodo: ${periodLabel(opts.period||'all')}`;

  const html = `
  <html><head><meta charset="utf-8"><title>Cobros por ${nice}</title>
  <style>
    @page{ size:A4 landscape; margin:12mm }
    body{ font-family:${state.cfg.font||'system-ui'}; color:#111 }
    h1{ margin:0 0 8px 0; font-size:18px }
    .meta{ color:#555; margin-bottom:8px }
    table{ width:100%; border-collapse:collapse; font-size:12px }
    th,td{ border:1px solid #cfcfcf; padding:6px 8px }
    th{ background:#f3f3f3; text-align:left }
    tfoot td{ font-weight:700; background:#fafafa }
  </style></head><body>
    <h1>Historial de Cobros — ${nice}${xTech}</h1>
    <div class="meta">${xPer} · Generado: ${new Date().toLocaleString()}</div>
    <table>
      <thead><tr><th>${nice}</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows||''}</tbody>
      <tfoot><tr><td>TOTAL</td><td style="text-align:right">${sumCount}</td><td style="text-align:right">$${sumTotal.toFixed(2)}</td></tr></tfoot>
    </table>
  </body></html>`;
  // Usa ventana de impresión (rápido y liviano)
  const w = window.open('','print'); w.document.open(); w.document.write(html); w.document.close(); w.focus(); w.print();
}

// ===== Wire up (conecta a tus botones) =====
function currentOpts(){ return { tech: currentTech(), period: currentPeriod() }; }

// Técnica específica
document.getElementById('btnTechDayCSV')   ?.addEventListener('click', ()=>exportGroupedCSV('day'  , currentOpts()));
document.getElementById('btnTechDayPDF')   ?.addEventListener('click', ()=>exportGroupedPDF('day'  , currentOpts()));
document.getElementById('btnTechMonthCSV') ?.addEventListener('click', ()=>exportGroupedCSV('month', currentOpts()));
document.getElementById('btnTechMonthPDF') ?.addEventListener('click', ()=>exportGroupedPDF('month', currentOpts()));
document.getElementById('btnTechYearCSV')  ?.addEventListener('click', ()=>exportGroupedCSV('year' , currentOpts()));
document.getElementById('btnTechYearPDF')  ?.addEventListener('click', ()=>exportGroupedPDF('year' , currentOpts()));

// Agrupados generales (sin fijar técnica)
document.getElementById('btnExportInvByTechCSV') ?.addEventListener('click', ()=>exportGroupedCSV('tech' , {period: currentPeriod()}));
document.getElementById('btnExportInvByTechPDF') ?.addEventListener('click', ()=>exportGroupedPDF('tech' , {period: currentPeriod()}));
document.getElementById('btnExportInvByDayCSV')  ?.addEventListener('click', ()=>exportGroupedCSV('day'  , {period: currentPeriod()}));
document.getElementById('btnExportInvByDayPDF')  ?.addEventListener('click', ()=>exportGroupedPDF('day'  , {period: currentPeriod()}));
document.getElementById('btnExportInvByHourCSV') ?.addEventListener('click', ()=>exportGroupedCSV('hour' , {period: currentPeriod()}));
document.getElementById('btnExportInvByHourPDF') ?.addEventListener('click', ()=>exportGroupedPDF('hour' , {period: currentPeriod()}));

// ===== Rellena el <select> de técnica desde tus datos (opcional) =====
(function hydrateTechFilter(){
  const sel = document.getElementById('invTechFilter');
  if (!sel) return;
  const techs = Array.from(new Set(state.invoices.map(i=>i.tech||''))).filter(Boolean).sort();
  sel.innerHTML = ['(todas)', ...techs].map(t=>`<option>${t}</option>`).join('');
})();

Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
