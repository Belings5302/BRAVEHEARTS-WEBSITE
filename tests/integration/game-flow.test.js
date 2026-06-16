import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Game Management Integration Tests', () => {
  it('should fetch game details and stats together', async () => {
    // Get all games first
    const gamesResponse = await request('http://localhost:3000')
      .get('/api/games');
    
    expect(gamesResponse.status).toBe(200);
    
    if (gamesResponse.body.games && gamesResponse.body.games.length > 0) {
      const gameId = gamesResponse.body.games[0].id;
      
      // Get game details
      const gameResponse = await request('http://localhost:3000')
        .get(`/api/games/${gameId}`);
      
      expect(gameResponse.status).toBe(200);
      expect(gameResponse.body).toHaveProperty('game');
      
      // Get game stats
      const statsResponse = await request('http://localhost:3000')
        .get(`/api/games/${gameId}/stats`);
      
      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body).toHaveProperty('stats');
    }
  });

  it('should fetch players and filter by team', async () => {
    // Get all players
    const allPlayersResponse = await request('http://localhost:3000')
      .get('/api/players');
    
    expect(allPlayersResponse.status).toBe(200);
    
    // Get men's team players
    const menPlayersResponse = await request('http://localhost:3000')
      .get('/api/players?team=men');
    
    expect(menPlayersResponse.status).toBe(200);
    
    // Get women's team players
    const womenPlayersResponse = await request('http://localhost:3000')
      .get('/api/players?team=women');
    
    expect(womenPlayersResponse.status).toBe(200);
  });
});
