const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const dataPath = path.resolve(__dirname, '..', 'data');
const dbPath = path.join(dataPath, 'database.sqlite');
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    subscription_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sku TEXT,
    category TEXT NOT NULL,
    price_mwk INTEGER NOT NULL,
    price_usd REAL NOT NULL,
    description TEXT,
    is_new INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    total_mwk INTEGER NOT NULL,
    total_usd REAL NOT NULL,
    payment_method TEXT NOT NULL,
    mobile_money_number TEXT,
    reference TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_mwk INTEGER NOT NULL,
    unit_price_usd REAL NOT NULL,
    total_price_mwk INTEGER NOT NULL,
    total_price_usd REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    amount_mwk INTEGER NOT NULL,
    amount_usd REAL NOT NULL,
    reference TEXT NOT NULL,
    transaction_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    status TEXT NOT NULL,
    price_mwk INTEGER NOT NULL,
    price_usd REAL NOT NULL,
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    payment_reference TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(admin_id) REFERENCES admins(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    number TEXT NOT NULL,
    position TEXT NOT NULL,
    nationality TEXT NOT NULL,
    height TEXT NOT NULL,
    age INTEGER NOT NULL,
    points_per_game REAL NOT NULL,
    team TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament TEXT NOT NULL,
    opponent TEXT NOT NULL,
    opponent_origin TEXT NOT NULL,
    team TEXT NOT NULL DEFAULT 'men',
    our_score INTEGER,
    opponent_score INTEGER,
    is_home INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'upcoming',
    outcome TEXT,
    game_date TEXT NOT NULL,
    game_time TEXT,
    venue TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS player_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    player_number INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    rebounds INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    steals INTEGER NOT NULL DEFAULT 0,
    blocks INTEGER NOT NULL DEFAULT 0,
    fouls INTEGER NOT NULL DEFAULT 0,
    turnovers INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE(game_id, player_number)
  )`);

  const playerStatsColumns = {
    minutes: 'TEXT',
    field_goals_made: 'INTEGER NOT NULL DEFAULT 0',
    field_goals_attempted: 'INTEGER NOT NULL DEFAULT 0',
    two_points_made: 'INTEGER NOT NULL DEFAULT 0',
    two_points_attempted: 'INTEGER NOT NULL DEFAULT 0',
    three_points_made: 'INTEGER NOT NULL DEFAULT 0',
    three_points_attempted: 'INTEGER NOT NULL DEFAULT 0',
    free_throws_made: 'INTEGER NOT NULL DEFAULT 0',
    free_throws_attempted: 'INTEGER NOT NULL DEFAULT 0',
    offensive_rebounds: 'INTEGER NOT NULL DEFAULT 0',
    defensive_rebounds: 'INTEGER NOT NULL DEFAULT 0',
    plus_minus: 'INTEGER NOT NULL DEFAULT 0',
    efficiency: 'INTEGER NOT NULL DEFAULT 0'
  };

  db.all("PRAGMA table_info(player_stats)", (err, cols) => {
    if (!err && Array.isArray(cols)) {
      const existing = new Set(cols.map(c => c.name));
      Object.entries(playerStatsColumns).forEach(([name, definition]) => {
        if (!existing.has(name)) {
          db.run(`ALTER TABLE player_stats ADD COLUMN ${name} ${definition}`);
        }
      });
    }
  });

  // Persistent admin sessions (survives server restarts / PC transfers)
  db.run(`CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    admin_email TEXT NOT NULL,
    admin_role TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(admin_id) REFERENCES admins(id)
  )`);

  // Seeding flags – tracks whether initial seed data has ever been inserted.
  // Prevents deleted data from reappearing on server restart.
  db.run(`CREATE TABLE IF NOT EXISTS seeding_flags (
    entity TEXT PRIMARY KEY,
    seeded_at TEXT NOT NULL
  )`);

  // Define new tables
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    user_id INTEGER,
    option_index INTEGER NOT NULL,
    ip_address TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS standings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament TEXT NOT NULL,
    team_name TEXT NOT NULL,
    played INTEGER NOT NULL DEFAULT 0,
    won INTEGER NOT NULL DEFAULT 0,
    lost INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    group_name TEXT DEFAULT 'A',
    team_category TEXT DEFAULT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  // Ensure `team_category` column exists for older databases
  db.all("PRAGMA table_info(standings)", (err, cols) => {
    if (!err && Array.isArray(cols)) {
      const hasCategory = cols.some(c => c.name === 'team_category');
      if (!hasCategory) {
        db.run(`ALTER TABLE standings ADD COLUMN team_category TEXT DEFAULT NULL`);
      }
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    admin_id INTEGER,
    type TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    media_type TEXT NOT NULL,
    media_url TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  // Dynamic column migrations for existing tables
  const addColumnIfNotExists = (table, column, definition) => {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
      // Ignore errors (e.g. column already exists)
    });
  };
  addColumnIfNotExists('players', 'bio', 'TEXT');
  addColumnIfNotExists('players', 'career_highlights', 'TEXT');
  addColumnIfNotExists('players', 'image_url', 'TEXT');
  addColumnIfNotExists('products', 'image_url', 'TEXT');
  addColumnIfNotExists('games', 'opponent_logo_url', 'TEXT');
  addColumnIfNotExists('products', 'status', "TEXT DEFAULT 'available'");
  addColumnIfNotExists('users', 'is_banned', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('standings', 'forfeit', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('standings', 'season', "TEXT DEFAULT '2025/2026'");
  addColumnIfNotExists('standings', 'points_for', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('standings', 'points_against', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('standings', 'point_difference', 'INTEGER DEFAULT 0');


  // Seed news
  db.get("SELECT 1 FROM seeding_flags WHERE entity = 'news'", (err, flag) => {
    if (err) return;
    if (!flag) {
      const now = new Date().toISOString();
      const newsData = [
        { title: "Bravehearts Secures Historic Road to BAL Qualifier Spot", category: "Announcement", content: "In a stunning display of basketball excellence, the Bravehearts Men's team clinched their spot in the next round of the Road to BAL qualifiers after defeating Fox Basketball Club. The team showed amazing resilience down the stretch.", image_url: "" },
        { title: "New 2026 Home Kits Unveiled in Lilongwe", category: "Merchandise", content: "Bravehearts Basketball Club today officially unveiled their new kits for the 2026 season. Styled in vibrant forest green with custom side panels, the jersey is now available in our Fan Zone shop.", image_url: "" },
        { title: "Community Scholarship Program Expands", category: "Community", content: "Under the leadership of Griffin Kalua, Bravehearts is proud to announce the extension of our scholarship program, supporting 15 more student-athletes at ABC Academy.", image_url: "" }
      ];
      const stmt = db.prepare('INSERT INTO news (title, category, content, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
      newsData.forEach(n => {
        stmt.run(n.title, n.category, n.content, n.image_url, now, now);
      });
      stmt.finalize();
      db.run("INSERT INTO seeding_flags (entity, seeded_at) VALUES ('news', ?)", [now]);
    }
  });

  // Seed gallery
  db.get("SELECT 1 FROM seeding_flags WHERE entity = 'gallery'", (err, flag) => {
    if (err) return;
    if (!flag) {
      const now = new Date().toISOString();
      const galleryData = [
        { title: "Bravehearts Men Team Photo 2026", media_type: "image", media_url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800" },
        { title: "Griffin Kalua coaching the boys", media_type: "image", media_url: "https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=800" },
        { title: "BAL Highlights vs Costa do Sol", media_type: "video", media_url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }
      ];
      const stmt = db.prepare('INSERT INTO gallery (title, media_type, media_url, created_at) VALUES (?, ?, ?, ?)');
      galleryData.forEach(g => {
        stmt.run(g.title, g.media_type, g.media_url, now);
      });
      stmt.finalize();
      db.run("INSERT INTO seeding_flags (entity, seeded_at) VALUES ('gallery', ?)", [now]);
    }
  });

  // Seed standings
  db.get("SELECT 1 FROM seeding_flags WHERE entity = 'standings'", (err, flag) => {
    if (err) return;
    if (!flag) {
      const now = new Date().toISOString();
      const standingsData = [
        { tournament: "CZBL 2026", team_name: "Bravehearts Men", team_category: "men", played: 10, won: 9, lost: 1, points: 19, group_name: "A" },
        { tournament: "CZBL 2026", team_name: "Lilongwe Wolves", team_category: null, played: 10, won: 8, lost: 2, points: 18, group_name: "A" },
        { tournament: "CZBL 2026", team_name: "Central Knights", team_category: null, played: 10, won: 6, lost: 4, points: 16, group_name: "A" },
        { tournament: "CZBL 2026", team_name: "Matero Magic (Guest)", team_category: null, played: 10, won: 4, lost: 6, points: 14, group_name: "A" },
        { tournament: "CZBL 2026", team_name: "ABC Academy", team_category: null, played: 10, won: 2, lost: 8, points: 12, group_name: "A" },
        { tournament: "CZBL 2026", team_name: "Wolves B", team_category: null, played: 10, won: 1, lost: 9, points: 11, group_name: "A" }
      ];
      const stmt = db.prepare('INSERT INTO standings (tournament, team_name, team_category, played, won, lost, points, group_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      standingsData.forEach(s => {
        stmt.run(s.tournament, s.team_name, s.team_category, s.played, s.won, s.lost, s.points, s.group_name, now, now);
      });
      stmt.finalize();
      db.run("INSERT INTO seeding_flags (entity, seeded_at) VALUES ('standings', ?)", [now]);
    }
  });

  // Seed polls
  db.get("SELECT 1 FROM seeding_flags WHERE entity = 'polls'", (err, flag) => {
    if (err) return;
    if (!flag) {
      const now = new Date().toISOString();
      db.run(
        "INSERT INTO polls (question, options, status, created_at) VALUES (?, ?, ?, ?)",
        [
          "Who was your MVP for the Road to BAL qualifiers?",
          JSON.stringify(["Kirk Smith, Jr.", "Marquis Cunningham", "Kevin Constant", "Harisson Banda"]),
          "active",
          now
        ],
        function(pollErr) {
          if (pollErr) return;
          const pollId = this.lastID;
          const stmt = db.prepare('INSERT INTO poll_votes (poll_id, user_id, option_index, ip_address, created_at) VALUES (?, ?, ?, ?, ?)');
          stmt.run(pollId, null, 0, "127.0.0.1", now);
          stmt.run(pollId, null, 0, "127.0.0.2", now);
          stmt.run(pollId, null, 1, "127.0.0.3", now);
          stmt.run(pollId, null, 2, "127.0.0.4", now);
          stmt.finalize();
        }
      );
      db.run("INSERT INTO seeding_flags (entity, seeded_at) VALUES ('polls', ?)", [now]);
    }
  });

  // Migration: Backfill team_category from team_name if NULL
  db.get("SELECT 1 FROM seeding_flags WHERE entity = 'backfill_team_category'", (err, flag) => {
    if (err) return;
    if (!flag) {
      db.all("SELECT id, team_name FROM standings WHERE team_category IS NULL", [], (err, rows) => {
        if (err || !rows || rows.length === 0) {
          db.run("INSERT INTO seeding_flags (entity, seeded_at) VALUES ('backfill_team_category', ?)", [new Date().toISOString()]);
          return;
        }

        const updates = [];
        rows.forEach(row => {
          const name = (row.team_name || '').toLowerCase();
          let category = null;
          if (name.includes('men')) category = 'men';
          else if (name.includes('boys')) category = 'boys';
          else if (name.includes('ladies')) category = 'ladies';
          else if (name.includes('girls')) category = 'girls';

          if (category) {
            updates.push({ id: row.id, category });
          }
        });

        if (updates.length > 0) {
          const stmt = db.prepare('UPDATE standings SET team_category = ? WHERE id = ?');
          updates.forEach(u => stmt.run(u.category, u.id));
          stmt.finalize();
        }

        db.run("INSERT INTO seeding_flags (entity, seeded_at) VALUES ('backfill_team_category', ?)", [new Date().toISOString()]);
      });
    }
  });

  db.get('SELECT COUNT(*) as count FROM admins', (err, row) => {
    if (err) return;
    if (row.count === 0) {
      const now = new Date().toISOString();
      const adminPassword = hashPassword('admin123');
      db.run(
        'INSERT INTO admins (email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin@bravehearts.mw', adminPassword, 'Admin', 'super-admin', now, now]
      );
    }
  });

  // Seed players – only if never seeded before (uses seeding_flags)
  db.get("SELECT 1 FROM seeding_flags WHERE entity = 'players'", (err, flag) => {
    if (err) return;
    if (!flag) {
      const now = new Date().toISOString();
      const playersData = [
        ...([
          { id: "m1", name: "Kirk Smith, Jr.", number: "0", position: "Forward", nationality: "USA / Belize", height: "6'7\"", age: 26, pointsPerGame: 18.5 },
          { id: "m2", name: "Kevin Constant", number: "3", position: "Guard", nationality: "USA", height: "6'3\"", age: 25, pointsPerGame: 16.2 },
          { id: "m3", name: "Harisson Banda", number: "7", position: "Guard", nationality: "Zambia", height: "6'1\"", age: 27, pointsPerGame: 12.8 },
          { id: "m4", name: "Milton Caifaz", number: "15", position: "Forward", nationality: "Mozambique", height: "6'6\"", age: 24, pointsPerGame: 14.1 },
          { id: "m5", name: "Marquis Cunningham", number: "33", position: "Forward/Center", nationality: "USA", height: "6'9\"", age: 28, pointsPerGame: 19.3 },
          { id: "m6", name: "Dylan Ngompe Lele", number: "11", position: "Forward", nationality: "Cameroon", height: "6'5\"", age: 23, pointsPerGame: 11.5 },
          { id: "m7", name: "Maxwell Ngonga", number: "5", position: "Guard", nationality: "Zambia", height: "6'2\"", age: 25, pointsPerGame: 9.7 },
          { id: "m8", name: "Tinotenda Nhira", number: "24", position: "Forward", nationality: "Zimbabwe", height: "6'6\"", age: 26, pointsPerGame: 10.2 },
          { id: "m9", name: "Faad Billy", number: "2", position: "Forward", nationality: "Malawi", height: "6'4\"", age: 22, pointsPerGame: 8.4 },
          { id: "m10", name: "Patrick Chirwa", number: "6", position: "Guard", nationality: "Malawi", height: "6'0\"", age: 24, pointsPerGame: 7.1 },
          { id: "m11", name: "Madalitso Kadiwa", number: "8", position: "Guard", nationality: "Malawi", height: "6'1\"", age: 23, pointsPerGame: 6.8 },
          { id: "m12", name: "Ian Owen Limbe", number: "10", position: "Guard", nationality: "Malawi", height: "5'11\"", age: 25, pointsPerGame: 7.9 },
          { id: "m13", name: "Kelvin Masiyano", number: "9", position: "Guard", nationality: "Malawi", height: "6'2\"", age: 24, pointsPerGame: 5.5 },
          { id: "m14", name: "Vincent Masiyano", number: "12", position: "Forward", nationality: "Malawi", height: "6'5\"", age: 26, pointsPerGame: 8.1 },
          { id: "m15", name: "Manello Munthali", number: "14", position: "Center", nationality: "Malawi", height: "6'10\"", age: 27, pointsPerGame: 6.2 }
        ].map(p => ({...p, team: 'men'}))),
        ...([
          { id: "w1", name: "Florence Phiri", number: "4", position: "Guard", nationality: "Malawi", height: "5'8\"", age: 23, pointsPerGame: 14.5 },
          { id: "w2", name: "Tadala Nkhoma", number: "8", position: "Forward", nationality: "Malawi", height: "6'0\"", age: 25, pointsPerGame: 13.2 },
          { id: "w3", name: "Chimwemwe Banda", number: "6", position: "Guard", nationality: "Malawi", height: "5'7\"", age: 22, pointsPerGame: 11.8 },
          { id: "w4", name: "Towera Manda", number: "10", position: "Forward", nationality: "Malawi", height: "5'11\"", age: 24, pointsPerGame: 10.5 },
          { id: "w5", name: "Hope Kabila", number: "15", position: "Center", nationality: "Malawi", height: "6'3\"", age: 26, pointsPerGame: 12.0 },
          { id: "w6", name: "Ellen Nyasulu", number: "5", position: "Guard", nationality: "Malawi", height: "5'9\"", age: 21, pointsPerGame: 8.2 },
          { id: "w7", name: "Beatrice Chikhula", number: "12", position: "Forward", nationality: "Malawi", height: "6'1\"", age: 24, pointsPerGame: 9.6 }
        ].map(p => ({...p, team: 'ladies'}))),
        ...([
          { id: "b1", name: "Joseph Phiri", number: "1", position: "Guard", nationality: "Malawi", height: "5'10\"", age: 17, pointsPerGame: 12.4 },
          { id: "b2", name: "Thomas Kalyandu", number: "2", position: "Forward", nationality: "Malawi", height: "6'1\"", age: 17, pointsPerGame: 11.7 },
          { id: "b3", name: "Samuel Banda", number: "3", position: "Guard", nationality: "Malawi", height: "5'11\"", age: 16, pointsPerGame: 10.5 },
          { id: "b4", name: "Micah Chirwa", number: "5", position: "Forward", nationality: "Malawi", height: "6'3\"", age: 18, pointsPerGame: 9.9 },
          { id: "b5", name: "David Mussa", number: "6", position: "Center", nationality: "Malawi", height: "6'6\"", age: 18, pointsPerGame: 8.8 },
          { id: "b6", name: "Owen Chitowe", number: "7", position: "Guard", nationality: "Malawi", height: "5'9\"", age: 16, pointsPerGame: 8.1 },
          { id: "b7", name: "Elijah Kasiya", number: "8", position: "Forward", nationality: "Malawi", height: "6'2\"", age: 17, pointsPerGame: 7.4 },
          { id: "b8", name: "Martin Munthali", number: "9", position: "Swingman", nationality: "Malawi", height: "6'0\"", age: 17, pointsPerGame: 9.0 }
        ].map(p => ({...p, team: 'boys'}))),
        ...([
          { id: "g1", name: "Anna Zgambo", number: "4", position: "Guard", nationality: "Malawi", height: "5'7\"", age: 16, pointsPerGame: 13.1 },
          { id: "g2", name: "Mercy Phiri", number: "8", position: "Forward", nationality: "Malawi", height: "5'10\"", age: 17, pointsPerGame: 12.0 },
          { id: "g3", name: "Lillian Banda", number: "10", position: "Center", nationality: "Malawi", height: "6'1\"", age: 17, pointsPerGame: 11.3 },
          { id: "g4", name: "Faith Kachidza", number: "5", position: "Guard", nationality: "Malawi", height: "5'8\"", age: 16, pointsPerGame: 10.4 },
          { id: "g5", name: "Nadine Phuka", number: "11", position: "Forward", nationality: "Malawi", height: "5'11\"", age: 16, pointsPerGame: 9.2 },
          { id: "g6", name: "Rejoice Chirwa", number: "12", position: "Guard", nationality: "Malawi", height: "5'9\"", age: 17, pointsPerGame: 8.6 },
          { id: "g7", name: "Martha Meke", number: "14", position: "Forward", nationality: "Malawi", height: "5'11\"", age: 18, pointsPerGame: 11.0 },
          { id: "g8", name: "Esther Kajipe", number: "15", position: "Center", nationality: "Malawi", height: "6'0\"", age: 17, pointsPerGame: 9.7 }
        ].map(p => ({...p, team: 'girls'})))
      ];

      const stmt = db.prepare('INSERT INTO players (id, name, number, position, nationality, height, age, points_per_game, team, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      playersData.forEach(p => {
        stmt.run(p.id, p.name, p.number, p.position, p.nationality, p.height, p.age, p.pointsPerGame, p.team, now, now);
      });
      stmt.finalize();
      db.run("INSERT INTO seeding_flags (entity, seeded_at) VALUES ('players', ?)", [now]);
    }
  });

  // Seed products – only if never seeded before
  db.get("SELECT 1 FROM seeding_flags WHERE entity = 'products'", (err, flag) => {
    if (err) return;
    if (!flag) {
      const now = new Date().toISOString();
      const products = [
        { id: 'p1', title: 'Bravehearts Home Jersey 2026', sku: 'BH-HOME-26', category: 'Apparel', price_mwk: 45000, price_usd: 15.00, description: 'Official 2026 home kit in vibrant Malawian forest green with neon lime side accents.', is_new: 1 },
        { id: 'p2', title: 'Bravehearts Away Jersey 2026', sku: 'BH-AWAY-26', category: 'Apparel', price_mwk: 45000, price_usd: 15.00, description: 'Official white away kit featuring green outlines and breathable lightweight fabrics.', is_new: 0 },
        { id: 'p3', title: 'Elite Road to BAL Hoodie', sku: 'BH-HOODIE-26', category: 'Apparel', price_mwk: 40000, price_usd: 22.00, description: 'Heavyweight premium cotton hoodie with the historic Elite 16 Road to BAL print.', is_new: 1 },
        { id: 'p4', title: 'Classic Club Snapback Cap', sku: 'BH-CAP-26', category: 'Headwear', price_mwk: 20000, price_usd: 8.00, description: 'Adjustable forest green cap featuring an embroidered bold Bravehearts crest.', is_new: 0 },
        { id: 'p5', title: 'VIP Match Ticket vs Wolves', sku: 'BH-TICKET-26', category: 'Tickets', price_mwk: 5000, price_usd: 3.00, description: 'Premium seating at ABC Blue Gym for the clash on June 12, includes complimentary drink.', is_new: 0 },
        { id: 'p6', title: 'Bravehearts Fan Club Membership', sku: 'BH-MEM-26', category: 'Membership', price_mwk: 50000, price_usd: 30.00, description: 'Annual support membership. Includes member scarf, 10% shop discount, and priority tickets.', is_new: 0 },
        { id: 'p7', title: 'Bravehearts Annual Subscription Fee', sku: 'BH-SUB-26', category: 'Subscription', price_mwk: 15000, price_usd: 10.00, description: 'Support the club\'s coaching, travel, and scholarship programs with an annual subscription fee.', is_new: 1 }
      ];
      const stmt = db.prepare('INSERT INTO products (id, title, sku, category, price_mwk, price_usd, description, is_new, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      products.forEach(product => {
        stmt.run(product.id, product.title, product.sku, product.category, product.price_mwk, product.price_usd, product.description, product.is_new, now, now);
      });
      stmt.finalize();
      db.run("INSERT INTO seeding_flags (entity, seeded_at) VALUES ('products', ?)", [now]);
    }
  });

  // Seed games data – only if never seeded before
  db.get("SELECT 1 FROM seeding_flags WHERE entity = 'games'", (err, flag) => {
    if (err) return;
    if (!flag) {
      const now = new Date().toISOString();
      const games = [
        { tournament: 'Road to BAL (Elite 16)', opponent: 'Costa do Sol', opponent_origin: 'Mozambique', team: 'men', our_score: 82, opponent_score: 76, is_home: 1, status: 'result', outcome: 'win', game_date: '2025-10-18', game_time: '18:00', venue: 'Cairo Arena, Egypt' },
        { tournament: 'Road to BAL (Elite 16)', opponent: 'Fox Basketball Club', opponent_origin: 'South Sudan', team: 'men', our_score: 74, opponent_score: 68, is_home: 0, status: 'result', outcome: 'win', game_date: '2025-10-20', game_time: '20:00', venue: 'Cairo Arena, Egypt' },
        { tournament: 'Road to BAL (Elite 16)', opponent: 'Matero Magic', opponent_origin: 'Zambia', team: 'men', our_score: 65, opponent_score: 78, is_home: 0, status: 'result', outcome: 'loss', game_date: '2025-10-22', game_time: '18:00', venue: 'Cairo Arena, Egypt' },
        { tournament: 'Central Zone Basketball League (CZBL)', opponent: 'Lilongwe Wolves', opponent_origin: 'Malawi', team: 'men', our_score: null, opponent_score: null, is_home: 1, status: 'upcoming', outcome: null, game_date: '2026-06-12', game_time: '18:00', venue: 'ABC Blue Gym, Lilongwe' },
        { tournament: 'Central Zone Basketball League (CZBL)', opponent: 'Central Knights', opponent_origin: 'Malawi', team: 'men', our_score: null, opponent_score: null, is_home: 0, status: 'upcoming', outcome: null, game_date: '2026-06-19', game_time: '19:30', venue: 'Kamuzu Stadium, Lilongwe' }
      ];
      const stmt = db.prepare('INSERT INTO games (tournament, opponent, opponent_origin, team, our_score, opponent_score, is_home, status, outcome, game_date, game_time, venue, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      games.forEach(g => {
        stmt.run(g.tournament, g.opponent, g.opponent_origin, g.team, g.our_score, g.opponent_score, g.is_home, g.status, g.outcome, g.game_date, g.game_time, g.venue, now, now);
      });
      stmt.finalize();
      db.run("INSERT INTO seeding_flags (entity, seeded_at) VALUES ('games', ?)", [now]);
    }
  });
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = { db, hashPassword };
