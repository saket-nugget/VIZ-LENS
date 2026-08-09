// Library helper tests — run by run_verifier_tests.js as a child process:
//   node --experimental-strip-types test/library_tests.mjs
// Imports the frontend TS module directly; mocked localStorage, no browser.
import { readLibrary, addToLibrary, updateQuizScore } from "../../frontend/app/lib/library.ts";

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const mockStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
  };
};

const entry = (slug, extra = {}) => ({
  slug,
  query: `query ${slug}`,
  topic: `topic ${slug}`,
  date: "2026-08-09T00:00:00.000Z",
  quizScore: null,
  ...extra,
});

// Basic add + read round trip
{
  const s = mockStorage();
  addToLibrary(entry("aaa"), s);
  addToLibrary(entry("bbb"), s);
  const lib = readLibrary(s);
  check("add + read round trip", lib.length === 2 && lib[0].slug === "aaa" && lib[1].slug === "bbb");
  check("entries never contain HTML", !("html" in lib[0]));
}

// Re-adding same slug dedupes instead of duplicating
{
  const s = mockStorage();
  addToLibrary(entry("aaa"), s);
  addToLibrary(entry("bbb"), s);
  addToLibrary(entry("aaa"), s);
  const lib = readLibrary(s);
  check("re-adding a slug dedupes", lib.length === 2 && lib[1].slug === "aaa");
}

// FIFO cap at 200
{
  const s = mockStorage();
  for (let i = 0; i < 205; i++) addToLibrary(entry(`slug${i}`), s);
  const lib = readLibrary(s);
  check("FIFO cap holds at 200", lib.length === 200);
  check("oldest entries dropped first", lib[0].slug === "slug5" && lib[199].slug === "slug204");
}

// quizScore update targets the right entry
{
  const s = mockStorage();
  addToLibrary(entry("aaa"), s);
  addToLibrary(entry("bbb"), s);
  updateQuizScore("aaa", 4, s);
  const lib = readLibrary(s);
  check("quizScore update targets the right entry",
    lib.find((e) => e.slug === "aaa").quizScore === 4 &&
    lib.find((e) => e.slug === "bbb").quizScore === null);
}

// Corrupt JSON recovers to empty and can be written over
{
  const s = mockStorage({ vl_library: "{not json[" });
  check("corrupt JSON reads as empty", readLibrary(s).length === 0);
  addToLibrary(entry("aaa"), s);
  check("corrupt JSON is written over", readLibrary(s).length === 1);
}

// Non-array JSON recovers to empty
{
  const s = mockStorage({ vl_library: '{"nope": true}' });
  check("non-array JSON reads as empty", readLibrary(s).length === 0);
}

// Throwing storage never crashes
{
  const throwing = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("quota"); },
  };
  let crashed = false;
  try {
    addToLibrary(entry("aaa"), throwing);
    updateQuizScore("aaa", 3, throwing);
    if (readLibrary(throwing).length !== 0) crashed = true;
  } catch {
    crashed = true;
  }
  check("blocked/full storage never throws", !crashed);
}

// Null storage (SSR) is a no-op
{
  let crashed = false;
  try {
    addToLibrary(entry("aaa"), null);
    if (readLibrary(null).length !== 0) crashed = true;
  } catch {
    crashed = true;
  }
  check("null storage (SSR) is a safe no-op", !crashed);
}

console.log(`LIBRARY_RESULT ${passed} ${failed}`);
process.exit(failed > 0 ? 1 : 0);
