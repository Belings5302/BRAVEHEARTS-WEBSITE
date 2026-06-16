const XLSX = require('xlsx');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const input = String(text || '').replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field.trim());
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field.trim());
      field = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some(value => value !== '')) rows.push(row);

  if (rows.length === 0) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((values, index) => {
    const item = { __rowNumber: index + 2 };
    headers.forEach((header, headerIndex) => {
      if (header) item[header] = values[headerIndex] ?? '';
    });
    return item;
  });
}

function normalizeHeader(header) {
  const compact = String(header || '')
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+([a-z0-9])/g, (_, char) => char.toUpperCase());

  const aliases = {
    team: 'teamName',
    teamname: 'teamName',
    teamName: 'teamName',
    teamCategory: 'teamCategory',
    teamcategory: 'teamCategory',
    category: 'teamCategory',
    division: 'teamCategory',
    competition: 'tournament',
    competitionName: 'tournament',
    league: 'tournament',
    tournamentName: 'tournament',
    seasonYear: 'season',
    gp: 'played',
    played: 'played',
    gamesPlayed: 'played',
    w: 'won',
    wins: 'won',
    l: 'lost',
    losses: 'lost',
    ff: 'forfeit',
    forfeits: 'forfeit',
    pointsFor: 'pointsFor',
    pf: 'pointsFor',
    pointsAgainst: 'pointsAgainst',
    pa: 'pointsAgainst',
    pointDifference: 'pointDifference',
    diff: 'pointDifference',
    pts: 'points',
    totalPoints: 'points',
    group: 'groupName',
    groupName: 'groupName',
    pointDifference: 'pointDifference',
    player: 'playerName',
    playername: 'playerName',
    playerName: 'playerName',
    playerNo: 'playerNumber',
    playerNumber: 'playerNumber',
    number: 'playerNumber',
    no: 'playerNumber',
    name: 'playerName',
    min: 'minutes',
    fgm: 'fieldGoalsMade',
    fga: 'fieldGoalsAttempted',
    twoPm: 'twoPointsMade',
    twoPa: 'twoPointsAttempted',
    threePm: 'threePointsMade',
    threePa: 'threePointsAttempted',
    ftm: 'freeThrowsMade',
    fta: 'freeThrowsAttempted',
    oreb: 'offensiveRebounds',
    dreb: 'defensiveRebounds',
    reb: 'rebounds',
    totreb: 'rebounds',
    totalRebounds: 'rebounds',
    ast: 'assists',
    stl: 'steals',
    blk: 'blocks',
    to: 'turnovers',
    tov: 'turnovers',
    personalFouls: 'fouls',
    pfouls: 'fouls',
    fouls: 'fouls',
    plusMinus: 'plusMinus',
    efficiency: 'efficiency',
    eff: 'efficiency'
  };

  return aliases[compact] || compact;
}

function parseSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const nonEmptyRows = matrix.filter(row => row.some(value => String(value || '').trim() !== ''));
  if (nonEmptyRows.length === 0) return [];

  const headers = nonEmptyRows[0].map(normalizeHeader);
  return nonEmptyRows.slice(1).map((values, index) => {
    const item = { __rowNumber: index + 2 };
    headers.forEach((header, headerIndex) => {
      if (header) item[header] = values[headerIndex] ?? '';
    });
    return item;
  });
}

function toInt(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = { parseCsv, parseSpreadsheet, toInt };
