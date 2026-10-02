import { fileURLToPath } from 'node:url';
import { createStore } from './store.mjs';
import { createProvider } from './provider.mjs';
import { createApp } from './app.mjs';

const connectionString = process.env.DATABASE_URL || process.env.ConnectionStrings__DefaultConnection;
const store = await createStore({ connectionString, file: process.env.AGENT_DATA_FILE || 'data/agents.sqlite' });
const app = createApp({ store, provider: createProvider(), staticDirectory: fileURLToPath(new URL('../frontend/dist/', import.meta.url)), allowedOrigins: [process.env.FRONTEND_ORIGIN, 'https://hub-loan.vercel.app', 'http://localhost:5173'].filter(Boolean) });
const port = Number(process.env.PORT || 5000);
app.server.listen(port, '0.0.0.0', () => console.log(`HubLoan agents: port ${port}, storage ${store.mode}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); await store.close(); process.exit(0); });
