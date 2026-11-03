// Self-check for the pure GitHub logic. Run: node src/lib/github/compute.check.mjs
import assert from 'node:assert/strict';
import {
  currentStreak, longestStreak, busiestDay, weekdayTotals, argmax, topDays, languageSlices,
  matchProjectRepos, computeStats, sampleData, mostActiveHour, flattenDays,
} from './compute.mjs';

// hand-made calendar: 2 weeks, Sun 2025-03-02 .. Sat 2025-03-15
const counts = [0, 2, 3, 1, 0, 4, 9, /* week 2 */ 0, 1, 1, 5, 2, 0, 0];
const mk = (c, i) => {
  const d = new Date(Date.UTC(2025, 2, 2 + i));
  return { date: d.toISOString().slice(0, 10), count: c, level: 0, weekday: d.getUTCDay() };
};
const days = counts.map(mk);
const weeks = [days.slice(0, 7), days.slice(7)];

assert.deepEqual(flattenDays(weeks).map((d) => d.count), counts);

// longest: Mon 3/3..Wed 3/5 is 3 days, Fri 3/7..Sat 3/8 is 2, Sun->? Mon 3/10..Fri 3/14 (1,1,5,2) is 4 -> wait Sat 3/8 (9) then Sun 3/9 (0)
// runs: [3/3..3/5]=3, [3/7..3/8]=2, [3/10..3/13]=4 (1,1,5,2)
assert.deepEqual(longestStreak(days), { length: 4, range: ['2025-03-10', '2025-03-13'] });

// current: ends on two empty days -> today (3/15) empty, yesterday (3/14) empty too -> 0
assert.equal(currentStreak(days), 0);
// drop the last 2 empty days: today (3/13) has 2 -> run of 4
assert.equal(currentStreak(days.slice(0, 12)), 4);
// today empty, yesterday counts
assert.equal(currentStreak(days.slice(0, 13)), 4);
// stale data vs a real "today"
assert.equal(currentStreak(days.slice(0, 12), '2025-03-20'), 0);
assert.equal(currentStreak(days.slice(0, 12), '2025-03-14'), 4);
assert.equal(currentStreak([]), 0);

assert.deepEqual(busiestDay(days), { date: '2025-03-08', count: 9 });
assert.equal(busiestDay([mk(0, 0)]), null);

// weekday totals: Sun 0+0, Mon 2+1, Tue 3+1, Wed 1+5, Thu 0+2, Fri 4+0, Sat 9+0
assert.deepEqual(weekdayTotals(days), [0, 3, 4, 6, 2, 4, 9]);
assert.equal(argmax(weekdayTotals(days)), 6);
assert.equal(argmax([0, 0]), null);

// top days + dominant repo
const td = topDays(days, { '2025-03-08': { alpha: 6, beta: 3 } }, 3);
assert.deepEqual(td.map((d) => d.count), [9, 5, 4]);
assert.equal(td[0].repo, 'alpha');
assert.equal(td[1].repo, null);

// languages fold + ratio
const langs = languageSlices([{ languages: [{ name: 'A', color: null, size: 60 }, { name: 'B', color: '#fff', size: 30 }, { name: 'C', color: '#000', size: 10 }] }], 2);
assert.deepEqual(langs.map((l) => [l.name, l.ratio]), [['A', 0.6], ['B', 0.3], ['Other', 0.1]]);

// project matching: case, separators, contains
const m = matchProjectRepos([{ name: 'Steal_A_Huss' }, { name: 'findr-app' }, { name: 'Conrad Challenge' }, { name: 'unrelated' }]);
assert.equal(m['steal-a-huss'].name, 'Steal_A_Huss');
assert.equal(m.findr.name, 'findr-app');
assert.equal(m['conrad-challenge'].name, 'Conrad Challenge');
assert.equal(m.lexia, undefined);

// hour in a fixed tz (UTC 20:00 = 12:00 PST in January)
assert.equal(mostActiveHour(['2025-01-10T20:05:00Z', '2025-01-11T20:50:00Z', '2025-01-12T03:00:00Z'], 'America/Los_Angeles'), 12);
assert.equal(mostActiveHour([]), null);

// stats glue
const st = computeStats(weeks, { commitTimes: ['2025-01-10T20:05:00Z'] });
assert.equal(st.longestStreak, 4);
assert.equal(st.mostActiveWeekday, 6);
assert.equal(st.mostActiveHour, 12);

// sample is deterministic and self-consistent
const now = new Date('2025-06-15T12:00:00Z');
const a = sampleData({ now });
const b = sampleData({ now });
assert.deepEqual(a, b);
assert.equal(a.source, 'sample');
assert.equal(a.calendar.weeks.at(-1).at(-1).date, '2025-06-15');
assert.equal(a.calendar.total, flattenDays(a.calendar.weeks).reduce((s, d) => s + d.count, 0));
assert.deepEqual(Object.keys(a.projects), []);

console.log('github compute: ok');
