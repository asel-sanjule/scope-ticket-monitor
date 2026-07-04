import 'dotenv/config';
import { scrapeMovieListing } from './listingScraper.js';

console.log('Starting scraper test...\n');

const movies = await scrapeMovieListing();

console.log(`\n✅ Total movies found: ${movies.length}\n`);
movies.forEach((m, i) => {
  console.log(`${i + 1}. ${m.title}`);
  console.log(`   URL:       ${m.movieUrl}`);
  console.log(`   Poster:    ${m.poster ? '✅' : '❌ missing'}`);
  console.log(`   Available: ${m.available ? '🟢 Buy Tickets' : '🔴 See More'}`);
  console.log('');
});