exports.up = async function(knex) {
  const exists = await knex.schema.hasColumn('standings', 'season');
  if (!exists) {
    await knex.schema.alterTable('standings', table => {
      table.string('season', 20).notNullable().defaultTo('2025/2026');
    });
  }
};

exports.down = async function() {
  // Forward-only for SQLite compatibility.
};
