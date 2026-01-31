import { DatabaseManager } from '../database/manager';

async function execute(dm: DatabaseManager) {
  // No HSN/SAC field to modify since it has been removed from the application
}

export default { execute, beforeMigrate: true };
