// Seed script — populates the database with 1000+ records.
// Run with: npm run seed
//
// Film titles, genres, runtimes and release years come from TMDB, so the
// watchlists hold real movies rather than generated names. The fields TMDB
// cannot know — which streaming service *you* have it on, what mood you file it
// under, whether you have seen it — are still generated per user, because they
// are per-person facts rather than properties of the film.
import './env.js';
import bcrypt from 'bcryptjs';
import {
  connectToDatabase,
  usersCollection,
  moviesCollection,
  sessionsCollection,
  client,
} from './db.js';
import { tmdbFetch, hasTmdbKey } from './tmdb.js';

const MOODS = ['cozy', 'intense', 'background noise', 'scary', 'funny'];

const PLATFORMS = [
  'Netflix',
  'Hulu',
  'Disney+',
  'Max',
  'Prime Video',
  'Apple TV+',
  'Peacock',
  'Paramount+',
];

const TOTAL_MOVIES = 1200;
const PAGES_PER_LIST = 12; // 20 films per page, per list
const DETAIL_CONCURRENCY = 8;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMoods() {
  const count = 1 + Math.floor(Math.random() * 2);
  const set = new Set();
  while (set.size < count) set.add(pick(MOODS));
  return [...set];
}

// Runs tasks with a fixed number in flight, so we stay well under TMDB's rate
// limit instead of firing several hundred requests at once.
async function mapWithConcurrency(items, limit, worker) {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    })()
  );
  await Promise.all(runners);
  return results;
}

// Two lists blended together: "popular" skews current and recognisable, while
// "top_rated" brings in the older classics. Together they give a catalogue that
// looks like something a real group of friends would actually argue over.
async function fetchFilmCatalog() {
  const listPaths = ['/movie/popular', '/movie/top_rated'];
  const byId = new Map();

  for (const listPath of listPaths) {
    for (let page = 1; page <= PAGES_PER_LIST; page += 1) {
      const data = await tmdbFetch(listPath, {
        language: 'en-US',
        page: String(page),
      });
      for (const movie of data.results || []) {
        if (movie.id && movie.title) byId.set(movie.id, movie);
      }
    }
    console.log(`  fetched ${PAGES_PER_LIST} pages of ${listPath}`);
  }

  const summaries = [...byId.values()];
  console.log(
    `  ${summaries.length} unique films; fetching runtimes and genres...`
  );

  // The list endpoints omit runtime and give genres only as numeric ids, so the
  // per-film detail call is what makes the seeded data actually usable.
  const detailed = await mapWithConcurrency(
    summaries,
    DETAIL_CONCURRENCY,
    async (movie) => {
      try {
        const detail = await tmdbFetch(`/movie/${movie.id}`, {
          language: 'en-US',
        });
        const runtime = Number(detail.runtime);
        if (!Number.isFinite(runtime) || runtime <= 0) return null;
        return {
          title: detail.title,
          genre: detail.genres?.[0]?.name || 'Drama',
          runtime,
        };
      } catch {
        return null; // one bad film should not sink the whole seed
      }
    }
  );

  return detailed.filter(Boolean);
}

async function seed() {
  if (!hasTmdbKey()) {
    console.error(
      'TMDB_API_KEY is not set, so the seed cannot fetch real films.\n' +
        'Add it to backend/.env (or the repo root .env) and run this again.\n' +
        'Get a free key at https://www.themoviedb.org/settings/api — either the\n' +
        'v3 API key or the v4 Read Access Token works.'
    );
    process.exit(1);
  }

  await connectToDatabase();

  console.log('Fetching the film catalogue from TMDB...');
  const catalog = await fetchFilmCatalog();
  if (catalog.length === 0) {
    throw new Error('TMDB returned no usable films; aborting before clearing.');
  }
  console.log(`Catalogue ready: ${catalog.length} real films.`);

  // Only clear once the new data is safely in hand, so a failed fetch cannot
  // leave the database empty.
  console.log('Clearing existing collections...');
  await moviesCollection().deleteMany({});
  await usersCollection().deleteMany({});
  await sessionsCollection().deleteMany({});

  // --- Users -------------------------------------------------------------
  const passwordHash = await bcrypt.hash('password', 10);
  const usernames = [
    'demo',
    'demo2',
    'alice',
    'bob',
    'carol',
    'dave',
    'erin',
    'frank',
    'grace',
    'heidi',
    'ivan',
    'judy',
    'mallory',
    'niaj',
    'olivia',
    'peggy',
    'trent',
    'victor',
    'wendy',
    'yves',
  ];

  const now = new Date();
  const userDocs = usernames.map((username) => ({
    username,
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    passwordHash,
    createdAt: now,
  }));
  const userResult = await usersCollection().insertMany(userDocs);
  const userIds = Object.values(userResult.insertedIds);
  console.log(`Inserted ${userIds.length} users.`);

  // --- Movies ------------------------------------------------------------
  // Each user gets their own shuffled slice of the catalogue, so watchlists
  // overlap the way real ones would without any one user listing a film twice.
  const movieDocs = [];
  const perUser = Math.ceil(TOTAL_MOVIES / userIds.length);

  for (const userId of userIds) {
    const shuffled = [...catalog].sort(() => Math.random() - 0.5);
    for (let i = 0; i < perUser && movieDocs.length < TOTAL_MOVIES; i += 1) {
      const film = shuffled[i % shuffled.length];
      movieDocs.push({
        userId,
        title: film.title,
        genre: film.genre,
        runtime: film.runtime,
        // Per-person facts TMDB has no view on.
        moodTags: pickMoods(),
        platform: pick(PLATFORMS),
        watched: Math.random() < 0.25,
        createdAt: now,
      });
    }
  }

  await moviesCollection().insertMany(movieDocs);
  console.log(
    `Inserted ${movieDocs.length} movies from ${catalog.length} real titles.`
  );

  console.log(
    `Done. Total records: ${userIds.length + movieDocs.length}. ` +
      'Log in with username "demo" / password "password".'
  );
  await client.close();
}

seed().catch(async (err) => {
  console.error('Seeding failed:', err);
  await client.close();
  process.exit(1);
});
