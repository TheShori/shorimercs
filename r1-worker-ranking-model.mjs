import {dayKey} from './r1-calendar-model.mjs?v=21';

export function isRankingTestMission(mission) {
  const text = `${mission.clientName || ''} ${mission.missionTitle || ''}`.normalize('NFKC').toLowerCase();
  return mission.isTest === true || /(^|[^\p{L}\p{N}])(?:pruebas?|tests?)(?=$|[^\p{L}\p{N}])/u.test(text);
}

export function buildWorkerRanking(missions, workers, month = 'ALL', now = Date.now()) {
  const currentMonth = dayKey(now).slice(0, 7);
  const months = new Set([currentMonth]);
  const rows = workers.map(worker => ({worker, completed: 0, inProgress: 0, paused: 0, pending: 0, totalOpen: 0, rank: null}));
  const byId = new Map(rows.map(row => [row.worker.id, row]));
  let excluded = 0, missingDates = 0, unavailableWorker = 0;
  for (const mission of missions) {
    if (isRankingTestMission(mission)) { excluded++; continue; }
    const row = byId.get(mission.workerId);
    if (!row) { unavailableWorker++; continue; }
    if (mission.status === 'Completada') {
      const date = dayKey(mission.completedAt);
      const validDate = date && mission.completedAt <= now && (!mission.createdAt || mission.completedAt >= mission.createdAt);
      const finishedMonth = validDate ? date.slice(0, 7) : null;
      if (finishedMonth) months.add(finishedMonth);
      else missingDates++;
      if (month === 'ALL' || finishedMonth === month) row.completed++;
    } else if (mission.status === 'En Progreso') row.inProgress++;
    else if (mission.status === 'En Pausa') row.paused++;
    else if (mission.status === 'Pendiente') row.pending++;
  }
  rows.sort((a, b) => b.completed - a.completed || String(a.worker.name || '').localeCompare(String(b.worker.name || ''), 'es') || String(a.worker.id).localeCompare(String(b.worker.id)));
  rows.forEach((row, i) => {
    row.totalOpen = row.inProgress + row.paused + row.pending;
    if (row.completed > 0) row.rank = i && rows[i - 1].completed === row.completed ? rows[i - 1].rank : i + 1;
  });
  return {rows, months: [...months].sort().reverse(), excluded, missingDates, unavailableWorker};
}
