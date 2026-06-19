exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamp('deleted_at');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('is_deleted');
    table.dropColumn('deleted_at');
  });
};
