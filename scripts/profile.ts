import { DatabaseManager } from 'backend/database/manager';
import { unlink } from 'fs/promises';
import { Fyo } from 'fyo';
import { DummyAuthDemux } from 'fyo/tests/helpers';
import { getTestDbPath } from 'tests/helpers';

async function run() {
  const fyo = new Fyo({
    DatabaseDemux: DatabaseManager,
    AuthDemux: DummyAuthDemux,
    isTest: true,
    isElectron: false,
  });
  const dbPath = getTestDbPath();

  await fyo.close();
  await unlink(dbPath);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run();
