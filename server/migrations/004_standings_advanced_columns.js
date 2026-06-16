exports.up = async function(knex) {
  const columns = [
    ['forfeits', table => table.integer('forfeits').notNullable().defaultTo(0)],
    ['points_for', table => table.integer('points_for').notNullable().defaultTo(0)],
    ['points_against', table => table.integer('points_against').notNullable().defaultTo(0)],
    ['point_difference', table => table.integer('point_difference').notNullable().defaultTo(0)],
  ];

  for (const [name, addColumn] of columns) {
    const exists = await knex.schema.hasColumn('standings', name);
    if (!exists) {
      await knex.schema.alterTable('standings', addColumn);
    }
  }
};

exports.down = async function() {
  // Forward-only for SQLite compatibility.
};
