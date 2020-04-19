const _ = require('lodash');

// NOTE: This migration should *ONLY* do data transport from nedb to sqlite
// At some point nedb will be removed from repo and this migration will be removed

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('../lib/config')} config
 * @param {import('../lib/logger')} appLog
 * @param {object} nedb - collection of nedb objects created in /lib/db.js
 */
// eslint-disable-next-line no-unused-vars
async function up(queryInterface, config, appLog, nedb) {
  /**
   * Clear tables in case of previous run failure
   *
   * On first run this is unnecessary,
   * as the tables are guaranteed to be empty.
   * However, if migration fails, it will not roll back the work
   * performed. We are not writing .down() methods and taking
   * a forward-only approach to migrations.
   * ========================================================
   */
  await queryInterface.bulkDelete('query_tags', {});
  await queryInterface.bulkDelete('queries', {});
  await queryInterface.bulkDelete('connections', {});
  await queryInterface.bulkDelete('connection_accesses', {});
  await queryInterface.bulkDelete('query_history', {});
  await queryInterface.bulkDelete('users', {});

  /**
   * QUERIES
   * ========================================================
   */
  const queries = await nedb.queries.find({});

  const queriesData = [];
  const queryTagsData = [];

  queries.forEach(originalQuery => {
    const newQuery = {
      id: originalQuery._id,
      name: originalQuery.name,
      connection_id: originalQuery.connectionId,
      query_text: originalQuery.queryText,
      chart: JSON.stringify(originalQuery.chartConfiguration),
      created_by: originalQuery.createdBy,
      modified_by: originalQuery.modifiedBy,
      created_at: originalQuery.createdDate,
      updated_at: originalQuery.modifiedDate,
      last_accessed_at: originalQuery.lastAccessDate
    };
    queriesData.push(newQuery);

    if (originalQuery.tags && originalQuery.tags.length) {
      const tags = _.uniq(originalQuery.tags).sort();
      tags.forEach(tag => {
        queryTagsData.push({ query_id: originalQuery._id, tag });
      });
    }
  });

  await queryInterface.bulkInsert('queries', queriesData);
  await queryInterface.bulkInsert('query_tags', queryTagsData);

  /**
   * CONNECTIONS
   * ========================================================
   */
  const originalConnections = await nedb.connections.find({});

  const connectionData = originalConnections.map(original => {
    const {
      name,
      driver,
      createdDate,
      modifiedDate,
      multiStatementTransactionEnabled,
      idleTimeoutSeconds,
      _id,
      ...rest
    } = original;

    // TODO FIXME XXX decrypt username/password,
    // and encrypt all of rest as JSON

    return {
      id: _id,
      name,
      driver,
      multi_statement_transaction_enabled: multiStatementTransactionEnabled,
      idle_timeout_seconds: idleTimeoutSeconds,
      data: JSON.stringify(rest),
      created_at: createdDate,
      updated_at: modifiedDate
    };
  });

  await queryInterface.bulkInsert('connections', connectionData);

  /**
   * CONNECTION ACCESSES
   * ========================================================
   */

  const originalConnectionAccesses = await nedb.connectionAccesses.find({});

  const connectionAccessData = originalConnectionAccesses.map(original => {
    return {
      connection_id: original.connectionId,
      connection_name: original.connectionName,
      user_id: original.userId,
      user_email: original.userEmail,
      duration: original.duration || 0,
      expiry_date: original.expiryDate || new Date(),
      created_at: original.createdDate
        ? new Date(original.createdDate)
        : new Date(),
      updated_at: original.modifiedDate ? new Date(original.modifiedDate) : null
    };
  });

  await queryInterface.bulkInsert('connection_accesses', connectionAccessData);

  /**
   * QUERY HISTORY
   * ========================================================
   */
  const originalHistory = await nedb.queryHistory.find({});

  const historyData = originalHistory.map(original => {
    return {
      user_id: original.userId,
      user_email: original.userEmail,
      connection_id: original.connectionId,
      connection_name: original.connectionName,
      start_time: original.startTime,
      stop_time: original.stopTime,
      query_run_time: original.queryRunTime,
      query_id: original.queryId,
      query_name: original.queryName,
      query_text: original.queryText,
      incomplete: original.incomplete,
      row_count: original.rowCount,
      created_at: original.createdDate
    };
  });

  await queryInterface.bulkInsert('query_history', historyData);

  /**
   * USERS
   * ========================================================
   */
  const originalUsers = await nedb.users.find({});

  const userData = originalUsers.map(original => {
    return {
      id: original._id,
      email: original.email,
      name: original.name,
      role: original.role,
      password_reset_id: original.passwordResetId,
      passhash: original.passhash,
      data: JSON.stringify(original.data),
      signup_at: original.signupDate,
      created_at: original.createdDate,
      updated_at: original.modifiedDate
    };
  });

  await queryInterface.bulkInsert('users', userData);
}

module.exports = {
  up
};
