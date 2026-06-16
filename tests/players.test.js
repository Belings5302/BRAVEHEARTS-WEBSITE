import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Players Routes', () => {
  it('should get all players', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/players');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('players');
    expect(Array.isArray(response.body.players)).toBe(true);
  });

  it('should filter players by team', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/players?team=men');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('players');
  });
});
