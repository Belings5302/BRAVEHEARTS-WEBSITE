exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.string('email_verification_token', 100);
    table.timestamp('email_verification_expires_at');
  }).then(() => knex('users').update({ email_verified: true }));
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('email_verified');
    table.dropColumn('email_verification_token');
    table.dropColumn('email_verification_expires_at');
  });
};
