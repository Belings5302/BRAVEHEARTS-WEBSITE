exports.up = function(knex) {
  return knex.schema
    // Users table
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('subscription_status', 50).defaultTo('pending');
      table.boolean('is_banned').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Products table
    .createTable('products', (table) => {
      table.string('id', 50).primary();
      table.string('title', 200).notNullable();
      table.string('sku', 50).notNullable();
      table.string('category', 50).notNullable();
      table.integer('price_mwk').notNullable();
      table.decimal('price_usd', 10, 2).notNullable();
      table.text('description');
      table.boolean('is_new').defaultTo(false);
      table.string('image_url', 500);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Orders table
    .createTable('orders', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('status', 50).defaultTo('pending');
      table.integer('total_mwk').notNullable();
      table.decimal('total_usd', 10, 2).notNullable();
      table.string('payment_method', 50).notNullable();
      table.string('mobile_money_number', 50);
      table.string('reference', 100).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Order items table
    .createTable('order_items', (table) => {
      table.increments('id').primary();
      table.integer('order_id').unsigned().references('id').inTable('orders').onDelete('CASCADE');
      table.string('product_id', 50).references('id').inTable('products').onDelete('CASCADE');
      table.integer('quantity').notNullable();
      table.integer('unit_price_mwk').notNullable();
      table.decimal('unit_price_usd', 10, 2).notNullable();
      table.integer('total_price_mwk').notNullable();
      table.decimal('total_price_usd', 10, 2).notNullable();
    })
    
    // Payments table
    .createTable('payments', (table) => {
      table.increments('id').primary();
      table.integer('order_id').unsigned().references('id').inTable('orders').onDelete('CASCADE');
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('method', 50).notNullable();
      table.string('status', 50).notNullable();
      table.integer('amount_mwk').notNullable();
      table.decimal('amount_usd', 10, 2).notNullable();
      table.string('reference', 100).notNullable();
      table.string('transaction_id', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Subscriptions table
    .createTable('subscriptions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('product_id', 50).references('id').inTable('products').onDelete('CASCADE');
      table.string('status', 50).defaultTo('pending');
      table.integer('price_mwk').notNullable();
      table.decimal('price_usd', 10, 2).notNullable();
      table.timestamp('started_at').notNullable();
      table.timestamp('expires_at').notNullable();
      table.string('payment_reference', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Admins table
    .createTable('admins', (table) => {
      table.increments('id').primary();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('name', 100);
      table.string('role', 50).defaultTo('admin');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Admin sessions table
    .createTable('admin_sessions', (table) => {
      table.string('session_id', 100).primary();
      table.integer('admin_id').unsigned().references('id').inTable('admins').onDelete('CASCADE');
      table.string('admin_email', 255).notNullable();
      table.string('admin_role', 50).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Password reset tokens table
    .createTable('password_reset_tokens', (table) => {
      table.increments('id').primary();
      table.string('token', 100).notNullable().unique();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.integer('admin_id').unsigned().references('id').inTable('admins').onDelete('CASCADE');
      table.string('type', 50).notNullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('used').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Games table
    .createTable('games', (table) => {
      table.increments('id').primary();
      table.string('tournament', 100).notNullable();
      table.string('opponent', 100).notNullable();
      table.string('opponent_origin', 100).notNullable();
      table.string('team', 20).defaultTo('men');
      table.integer('our_score');
      table.integer('opponent_score');
      table.boolean('is_home').defaultTo(true);
      table.string('status', 50).defaultTo('upcoming');
      table.string('outcome', 20);
      table.date('game_date').notNullable();
      table.time('game_time');
      table.string('venue', 200);
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Player stats table
    .createTable('player_stats', (table) => {
      table.increments('id').primary();
      table.integer('game_id').unsigned().references('id').inTable('games').onDelete('CASCADE');
      table.integer('player_number').notNullable();
      table.string('player_name', 100).notNullable();
      table.integer('points').defaultTo(0);
      table.integer('rebounds').defaultTo(0);
      table.integer('assists').defaultTo(0);
      table.integer('steals').defaultTo(0);
      table.integer('blocks').defaultTo(0);
      table.integer('fouls').defaultTo(0);
      table.integer('turnovers').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Players table
    .createTable('players', (table) => {
      table.string('id', 50).primary();
      table.string('name', 100).notNullable();
      table.integer('number').notNullable();
      table.string('position', 50).notNullable();
      table.string('nationality', 100);
      table.string('height', 20);
      table.integer('age');
      table.decimal('points_per_game', 5, 1);
      table.string('team', 20).defaultTo('men');
      table.text('bio');
      table.text('career_highlights');
      table.string('image_url', 500);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // News table
    .createTable('news', (table) => {
      table.increments('id').primary();
      table.string('title', 200).notNullable();
      table.string('category', 50).notNullable();
      table.text('content').notNullable();
      table.string('image_url', 500);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Gallery table
    .createTable('gallery', (table) => {
      table.increments('id').primary();
      table.string('title', 200).notNullable();
      table.string('media_type', 20).notNullable();
      table.string('media_url', 500).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Standings table
    .createTable('standings', (table) => {
      table.increments('id').primary();
      table.string('tournament', 100).notNullable();
      table.string('team_name', 100).notNullable();
      table.integer('played').defaultTo(0);
      table.integer('won').defaultTo(0);
      table.integer('lost').defaultTo(0);
      table.integer('points').defaultTo(0);
      table.string('group_name', 10).defaultTo('A');
      table.string('team_category', 50);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    
    // Polls table
    .createTable('polls', (table) => {
      table.increments('id').primary();
      table.string('question', 500).notNullable();
      table.text('options').notNullable();
      table.string('status', 50).defaultTo('active');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Poll votes table
    .createTable('poll_votes', (table) => {
      table.increments('id').primary();
      table.integer('poll_id').unsigned().references('id').inTable('polls').onDelete('CASCADE');
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.integer('option_index').notNullable();
      table.string('ip_address', 50);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Notifications table
    .createTable('notifications', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.text('message').notNullable();
      table.boolean('is_read').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    
    // Admin logs table
    .createTable('admin_logs', (table) => {
      table.increments('id').primary();
      table.integer('admin_id').unsigned().references('id').inTable('admins').onDelete('CASCADE');
      table.string('action', 100).notNullable();
      table.string('target', 100);
      table.text('details');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('admin_logs')
    .dropTableIfExists('notifications')
    .dropTableIfExists('poll_votes')
    .dropTableIfExists('polls')
    .dropTableIfExists('standings')
    .dropTableIfExists('gallery')
    .dropTableIfExists('news')
    .dropTableIfExists('players')
    .dropTableIfExists('player_stats')
    .dropTableIfExists('games')
    .dropTableIfExists('password_reset_tokens')
    .dropTableIfExists('admin_sessions')
    .dropTableIfExists('admins')
    .dropTableIfExists('subscriptions')
    .dropTableIfExists('payments')
    .dropTableIfExists('order_items')
    .dropTableIfExists('orders')
    .dropTableIfExists('products')
    .dropTableIfExists('users');
};
