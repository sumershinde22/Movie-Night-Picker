// Seed script — populates the database with 1000+ synthetic records.
// Run with: npm run seed
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {
  connectToDatabase,
  usersCollection,
  moviesCollection,
  sessionsCollection,
  client,
} from './db.js';

const GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Thriller',
  'Animation',
  'Documentary',
  'Fantasy',
];

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

const TITLE_ADJ = [
  'Silent',
  'Crimson',
  'Last',
  'Broken',
  'Hidden',
  'Endless',
  'Frozen',
  'Golden',
  'Savage',
  'Electric',
  'Midnight',
  'Velvet',
  'Distant',
  'Burning',
  'Quiet',
];

const TITLE_NOUN = [
  'Horizon',
  'Empire',
  'Shadow',
  'Voyage',
  'Promise',
  'Machine',
  'Kingdom',
  'Echo',
  'Harbor',
  'Legacy',
  'Paradox',
  'Requiem',
  'Odyssey',
  'Mirage',
  'Frontier',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMoods() {
  const count = 1 + Math.floor(Math.random() * 2);
  const set = new Set();
  while (set.size < count) set.add(pick(MOODS));
  return [...set];
}

function makeTitle(i) {
  return `${pick(TITLE_ADJ)} ${pick(TITLE_NOUN)} ${i}`;
}

async function seed() {
  await connectToDatabase();

  console.log('Clearing existing collections...');
  await moviesCollection().deleteMany({});
  await usersCollection().deleteMany({});
  await sessionsCollection().deleteMany({});

  // --- Users -------------------------------------------------------------
  const passwordHash = await bcrypt.hash('password', 10);
  const usernames = [
    'demo',
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
    'walter',
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

  // --- Movies (1,200 records) -------------------------------------------
  const TOTAL_MOVIES = 1200;
  const movieDocs = [];
  for (let i = 1; i <= TOTAL_MOVIES; i += 1) {
    const ownerId = userIds[i % userIds.length];
    movieDocs.push({
      userId: ownerId,
      title: makeTitle(i),
      genre: pick(GENRES),
      moodTags: pickMoods(),
      runtime: 80 + Math.floor(Math.random() * 100), // 80–179 minutes
      platform: pick(PLATFORMS),
      watched: Math.random() < 0.25,
      createdAt: now,
    });
  }
  await moviesCollection().insertMany(movieDocs);
  console.log(`Inserted ${movieDocs.length} movies.`);

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
