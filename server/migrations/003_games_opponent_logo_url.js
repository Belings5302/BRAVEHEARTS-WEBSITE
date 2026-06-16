exports.up = async function(knex) {
  const exists = await knex.schema.hasColumn('games', 'opponent_logo_url');
  if (!exists) {
    await knex.schema.alterTable('games', table => {
      table.string('opponent_logo_url', 500);
    });
  }
};

exports.down = async function() {
  // Forward-only for SQLite compatibility; dropping columns can require table rebuilds.
};
