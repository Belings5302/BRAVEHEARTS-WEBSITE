import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Content Management Integration Tests', () => {
  it('should fetch news and gallery together', async () => {
    // Get news
    const newsResponse = await request('http://localhost:3000')
      .get('/api/news');
    
    expect(newsResponse.status).toBe(200);
    expect(newsResponse.body).toHaveProperty('news');
    
    // Get gallery
    const galleryResponse = await request('http://localhost:3000')
      .get('/api/gallery');
    
    expect(galleryResponse.status).toBe(200);
    expect(galleryResponse.body).toHaveProperty('gallery');
  });

  it('should fetch standings and polls together', async () => {
    // Get standings
    const standingsResponse = await request('http://localhost:3000')
      .get('/api/standings');
    
    expect(standingsResponse.status).toBe(200);
    expect(standingsResponse.body).toHaveProperty('standings');
    
    // Get polls
    const pollsResponse = await request('http://localhost:3000')
      .get('/api/polls');
    
    expect(pollsResponse.status).toBe(200);
    expect(pollsResponse.body).toHaveProperty('polls');
  });

  it('should fetch products and notifications together', async () => {
    // Get products
    const productsResponse = await request('http://localhost:3000')
      .get('/api/products');
    
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body).toHaveProperty('products');
    
    // Get notifications
    const notificationsResponse = await request('http://localhost:3000')
      .get('/api/notifications');
    
    expect(notificationsResponse.status).toBe(200);
    expect(notificationsResponse.body).toHaveProperty('notifications');
  });
});
