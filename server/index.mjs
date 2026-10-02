import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { localEncryptionKey } from './local-key.mjs';
import { createStore } from './store.mjs';
import { createProvider } from './provider.mjs';
import { createApp } from './app.mjs';
import { autonomyMasterKey } from './autonomy.mjs';

const connectionString = process.env.DATABASE_URL || process.env.ConnectionStrings__DefaultConnection;
const dataFile = process.env.AGENT_DATA_FILE || 'data/agents.sqlite';
const store = await createStore({ connectionString, file: dataFile });
const encryptionKey = process.env.AGENT_ENCRYPTION_KEY || (!connectionString ? await localEncryptionKey(join(dirname(dataFile), 'autonomy.key')) : undefined);
const app = createApp({ store, masterKey: autonomyMasterKey({ encryptionKey, connectionString }), provider: createProvider(), publicOrigin: process.env.SHOP_PUBLIC_ORIGIN || 'https://hub-loan.vercel.app', webhookOrigin: process.env.SHOP_WEBHOOK_ORIGIN || 'https://hubloan.onrender.com', staticDirectory: fileURLToPath(new URL('../frontend/dist/', import.meta.url)), allowedOrigins: [process.env.FRONTEND_ORIGIN, 'https://hub-loan.vercel.app', 'http://localhost:5173'].filter(Boolean) });
const port = Number(process.env.PORT || 5000);
app.server.listen(port, '0.0.0.0', () => console.log(`HubLoan agents: port ${port}, storage ${store.mode}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); await store.close(); process.exit(0); });
