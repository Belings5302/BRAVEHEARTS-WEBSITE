exports.up = async function(knex) {
  const addColumn = async (name, callback) => {
    const exists = await knex.schema.hasColumn('player_stats', name);
    if (!exists) {
      await knex.schema.alterTable('player_stats', callback);
    }
  };

  await addColumn('minutes', table => table.string('minutes', 10));
  await addColumn('field_goals_made', table => table.integer('field_goals_made').notNullable().defaultTo(0));
  await addColumn('field_goals_attempted', table => table.integer('field_goals_attempted').notNullable().defaultTo(0));
  await addColumn('two_points_made', table => table.integer('two_points_made').notNullable().defaultTo(0));
  await addColumn('two_points_attempted', table => table.integer('two_points_attempted').notNullable().defaultTo(0));
  await addColumn('three_points_made', table => table.integer('three_points_made').notNullable().defaultTo(0));
  await addColumn('three_points_attempted', table => table.integer('three_points_attempted').notNullable().defaultTo(0));
  await addColumn('free_throws_made', table => table.integer('free_throws_made').notNullable().defaultTo(0));
  await addColumn('free_throws_attempted', table => table.integer('free_throws_attempted').notNullable().defaultTo(0));
  await addColumn('offensive_rebounds', table => table.integer('offensive_rebounds').notNullable().defaultTo(0));
  await addColumn('defensive_rebounds', table => table.integer('defensive_rebounds').notNullable().defaultTo(0));
  await addColumn('plus_minus', table => table.integer('plus_minus').notNullable().defaultTo(0));
  await addColumn('efficiency', table => table.integer('efficiency').notNullable().defaultTo(0));
};

exports.down = async function() {
  // SQLite cannot reliably drop columns across all supported versions without
  // rebuilding the table. Keep this migration forward-only to avoid data loss.
};
