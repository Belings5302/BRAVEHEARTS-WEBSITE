exports.up = async function(knex) {
  const exists = await knex.schema.hasColumn('standings', 'forfeit');
  if (!exists) {
    await knex.schema.alterTable('standings', table => {
      table.integer('forfeit').notNullable().defaultTo(0);
    });
  }
};

exports.down = async function() {
  // Forward-only for SQLite compatibility.
};
