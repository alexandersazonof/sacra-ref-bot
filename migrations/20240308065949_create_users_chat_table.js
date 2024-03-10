/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users_chat', table => {
    table.bigint('chatId').primary();
    table.string('address').nullable();
    table.boolean('isAwaitingAddress').notNullable().defaultTo(false);
    table.boolean('hasEnteredAddress').notNullable().defaultTo(false);
    table.timestamps();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users_chat');
};
