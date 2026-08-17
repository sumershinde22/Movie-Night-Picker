// Environment loading, imported first by anything with a main() (server, seed).
//
// `dotenv/config` resolves .env against the *current working directory*, so
// `npm run seed` from backend/ and `node backend/server.js` from the repo root
// would look in different places. Load both known locations explicitly instead:
// dotenv never overwrites a variable that is already set, so backend/.env wins
// where it exists, the repo-root .env is the fallback, and real environment
// variables (as on Render) always take precedence over both.
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const backendDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(backendDir, '.env') });
dotenv.config({ path: path.join(backendDir, '..', '.env') });
