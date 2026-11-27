import React, {useState} from 'react';
import {dayKey, workerColor} from './r1-calendar-model.mjs?v=21';
import {buildWorkerRanking} from './r1-worker-ranking-model.mjs?v=22';

const h = React.createElement;
const monthLabel = value => new Intl.DateTimeFormat('es-ES', {month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(value + '-01T12:00:00Z'));
const css = `.mr-rank{background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:20px;color:#e2e8f0;min-width:0}.mr-rank-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.mr-rank h3{font-size:18px;font-weight:800;margin:0}.mr-rank p{font-size:12px;line-height:1.6;color:#94a3b8;margin:6px 0 0}.mr-rank label{display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1}.mr-rank select{background:#020617;color:#e2e8f0;border:1px solid #334155;border-radius:9px;padding:8px;font:inherit;max-width:100%}.mr-rank select:focus-visible,.mr-rank-scroll:focus-visible{outline:2px solid #a5b4fc;outline-offset:2px}.mr-rank-scroll{overflow:auto;border:1px solid #1e293b;border-radius:12px}.mr-rank table{width:100%;min-width:610px;border-collapse:collapse;font-size:13px}.mr-rank th{font-size:11px;color:#94a3b8;font-weight:600;background:#020617;padding:9px 12px;text-align:center}.mr-rank td{padding:12px;text-align:center;border-top:1px solid #1e293b;font-variant-numeric:tabular-nums}.mr-rank tbody th{font-size:13px;background:transparent;padding:12px;border-top:1px solid #1e293b;color:#e2e8f0}.mr-rank .mr-name{text-align:left;max-width:220px;overflow-wrap:anywhere}.mr-worker{display:flex;align-items:center;gap:8px;font-weight:700}.mr-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}.mr-done{font-weight:800;color:#34d399}.mr-position{font-weight:800;color:#cbd5e1}.mr-rank details{font-size:12px;color:#94a3b8;margin-top:12px}.mr-rank summary{cursor:pointer}.mr-rank details p{margin-top:6px}@media(max-width:600px){.mr-rank{padding:14px}.mr-rank h3{font-size:16px}}`;

function Ranking({missions, workers}) {
  const [month, setMonth] = useState(() => dayKey(Date.now()).slice(0, 7));
  const result = buildWorkerRanking(missions, workers, month);
  const options = [...new Set([...result.months, ...(month === 'ALL' ? [] : [month])])].sort().reverse();
  return h('section', {className: 'mr-rank', 'aria-label': 'Ranking de mercenarios'},
    h('style', null, css),
    h('div', {className: 'mr-rank-head'},
      h('div', null, h('h3', null, '🏆 Ranking de mercenarios'), h('p', null, 'Por misiones completadas · Los empates comparten posición.')),
      h('label', null, 'Periodo', h('select', {'aria-label': 'Periodo del ranking', value: month, onChange: e => setMonth(e.target.value)},
        h('option', {value: 'ALL'}, 'Todo el histórico'), ...options.map(value => h('option', {key: value, value}, monthLabel(value)))))),
    !result.rows.length ? h('p', null, 'Todavía no hay mercenarios para mostrar.') :
    h('div', {className: 'mr-rank-scroll', tabIndex: 0, role: 'region', 'aria-label': 'Clasificación y carga actual de los mercenarios'},
      h('table', null,
        h('thead', null,
          h('tr', null, h('th', {rowSpan: 2, scope: 'col'}, 'Pos.'), h('th', {rowSpan: 2, scope: 'col', className: 'mr-name'}, 'Mercenario'), h('th', {rowSpan: 2, scope: 'col'}, 'Completadas'), h('th', {colSpan: 3, scope: 'colgroup'}, 'Carga actual')),
          h('tr', null, h('th', {scope: 'col'}, 'En curso'), h('th', {scope: 'col'}, 'En pausa'), h('th', {scope: 'col'}, 'Pendientes'))),
        h('tbody', null, ...result.rows.map(row => h('tr', {key: row.worker.id},
          h('td', {className: 'mr-position'}, row.rank === null ? '—' : `${row.rank}º`),
          h('th', {scope: 'row', className: 'mr-name'}, h('span', {className: 'mr-worker'}, h('span', {className: 'mr-dot', style: {background: workerColor(row.worker.color)}, 'aria-hidden': true}), row.worker.name || 'Sin nombre')),
          h('td', {className: 'mr-done'}, row.completed), h('td', {style: {color: '#fbbf24'}}, row.inProgress), h('td', {style: {color: '#22d3ee'}}, row.paused), h('td', null, row.pending)))))),
    h('p', null, 'El periodo usa la fecha de finalización (hora de Madrid). La carga y el mercenario asignado son los actuales.'),
    h('details', null, h('summary', null, 'Qué se cuenta'),
      h('p', null, `Se excluyen las misiones marcadas como prueba o con «prueba» / «test» en el cliente o título (${result.excluded}).`),
      result.missingDates > 0 && h('p', null, `${result.missingDates} completadas sin fecha de finalización válida: solo se incluyen en «Todo el histórico».`),
      result.unavailableWorker > 0 && h('p', null, `${result.unavailableWorker} misiones sin un mercenario disponible quedan fuera del ranking.`)));
}

export function R1WorkerRanking({authUser, missions = [], workers = []}) {
  if (authUser?.email?.toLowerCase() !== 'victorsoripar@gmail.com') return null;
  return h(Ranking, {missions, workers});
}
