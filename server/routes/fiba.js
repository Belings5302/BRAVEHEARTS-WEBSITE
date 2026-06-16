const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { normalizePageSize, requestFiba } = require('../services/fiba');

const router = express.Router();

function paginationQuery(req) {
  return {
    pageSize: normalizePageSize(req.query.pageSize),
    pageToken: req.query.pageToken || undefined,
    filter: req.query.filter || undefined,
    orderBy: req.query.orderBy || undefined,
  };
}

// Public proxy for configured FIBA GDAP resources. The upstream resource path is
// intentionally explicit to keep this route resource-oriented and avoid exposing
// secrets or arbitrary URLs to clients.
router.get('/competitions', asyncHandler(async (req, res) => {
  const data = await requestFiba('/competitions', paginationQuery(req));
  res.json({ competitions: data?.competitions || data?.items || data || [], nextPageToken: data?.nextPageToken || '' });
}));

router.get('/competitions/:competitionId/games', asyncHandler(async (req, res) => {
  const data = await requestFiba(`/competitions/${encodeURIComponent(req.params.competitionId)}/games`, paginationQuery(req));
  res.json({ games: data?.games || data?.items || data || [], nextPageToken: data?.nextPageToken || '' });
}));

router.get('/competitions/:competitionId/teams', asyncHandler(async (req, res) => {
  const data = await requestFiba(`/competitions/${encodeURIComponent(req.params.competitionId)}/teams`, paginationQuery(req));
  res.json({ teams: data?.teams || data?.items || data || [], nextPageToken: data?.nextPageToken || '' });
}));

router.get('/games/:gameId', asyncHandler(async (req, res) => {
  const game = await requestFiba(`/games/${encodeURIComponent(req.params.gameId)}`);
  res.json({ game });
}));

module.exports = router;
