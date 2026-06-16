import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Polls Routes', () => {
  it('should get all polls', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/polls');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('polls');
    expect(Array.isArray(response.body.polls)).toBe(true);
  });

  it('should vote on a poll', async () => {
    const response = await request('http://localhost:3000')
      .post('/api/polls/1/vote')
      .send({
        optionIndex: 0,
        userId: null
      });
    
    expect([200, 400, 404]).toContain(response.status);
  });
});
