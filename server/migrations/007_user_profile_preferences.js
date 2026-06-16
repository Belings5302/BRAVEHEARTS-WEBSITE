exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('profile_photo_url', 500);
    table.string('favorite_team', 30);
    table.string('favorite_player', 100);
    table.boolean('notify_game_reminders').defaultTo(true);
    table.boolean('notify_live_scores').defaultTo(true);
    table.boolean('notify_news').defaultTo(true);
    table.boolean('notify_merch').defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('profile_photo_url');
    table.dropColumn('favorite_team');
    table.dropColumn('favorite_player');
    table.dropColumn('notify_game_reminders');
    table.dropColumn('notify_live_scores');
    table.dropColumn('notify_news');
    table.dropColumn('notify_merch');
  });
};
