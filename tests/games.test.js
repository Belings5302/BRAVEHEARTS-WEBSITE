import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Games Routes', () => {
  it('should get all games', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/games');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('games');
    expect(Array.isArray(response.body.games)).toBe(true);
  });

  it('should get a specific game by ID', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/games/1');
    
    expect([200, 404]).toContain(response.status);
  });

  it('should get player stats for a game', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/games/1/stats');
    
    expect([200, 404]).toContain(response.status);
  });
});
