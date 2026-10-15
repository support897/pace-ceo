// Pace CEO battery: the room opens ONLY for the pinned owner,
// and every number on the wall is the seeded aggregate — counts,
// never people. Runs the real CEO app against the shared mock.
import { chromium } from "/home/hatch/node_modules/playwright-core/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
import { startMock } from "./mock-firebase.mjs";
const ROOT = "/home/hatch/workspace/pace-ceo";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".ttf": "font/ttf" };
const mock = await startMock();
// Seed: owner + an ordinary user + aggregates.
mock.users.set("owner@test.dev", { uid: "uid-owner", email: "owner@test.dev", password: "owner-pw" });
mock.users.set("user@test.dev", { uid: "uid-user1", email: "user@test.dev", password: "user-pw" });
mock.ownerUids.push("uid-owner");
const wk = (d) => new Date(Date.now() - d * 86400000).toISOString();
mock.docs.set("aggSignups/uid-user1", { createdAt: wk(2), lastActiveAt: wk(0), activatedAt: wk(1), activationKind: "event" });
mock.docs.set("aggSignups/uid-user2", { createdAt: wk(9), lastActiveAt: wk(3), activatedAt: wk(8), activationKind: "import" });
mock.docs.set("aggSignups/uid-user3", { createdAt: wk(20), lastActiveAt: wk(20) });
mock.docs.set("aggSubs/uid-user1", { plan: "top", status: "active", amountCents: 1999, currency: "AUD" });
mock.docs.set("aggSubs/uid-user2", { plan: "top", status: "pending-cancel", amountCents: 1999, currency: "AUD", cancelReason: "Too busy right now" });
mock.docs.set("aggSubs/uid-user3", { plan: "top", status: "ended", amountCents: 1999, currency: "AUD" });
mock.docs.set("aggImports/uid-user1", { events: 12, imports: 1, at: wk(1) });
mock.docs.set("aggImports/uid-user2", { events: 30, imports: 2, at: wk(8) });
mock.docs.set("reviews/r1", { platform: "Play", rating: 5, title: "Calm at last", body: "It shrinks my day when I need it to.", author: "A reviewer", date: wk(1), replied: false });
const testConfig = `window.PACE_FB_CONFIG = { apiKey: "test-key-1234567890", authDomain: "x", projectId: "pace-test", appId: "1:x:web:y", googleClientId: null, appleEnabled: false, restAuth: "http://127.0.0.1:${mock.port}", restFirestore: "http://127.0.0.1:${mock.port}", restToken: "http://127.0.0.1:${mock.port}" };`;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  if (p === "/firebase-config.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(testConfig); return; }
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(9125, r));
let pass = 0, fail = 0;
const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
const b = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 900, height: 1000 } });
p.setDefaultTimeout(9000);
await p.goto("http://localhost:9125/", { waitUntil: "networkidle" }); await p.waitForTimeout(500);
check("the door is all a signed-out visitor meets", await p.evaluate(() => !document.getElementById("door").hidden && document.getElementById("room").hidden));
await p.fill("#email", "user@test.dev"); await p.fill("#pass", "user-pw"); await p.click("#signIn"); await p.waitForTimeout(1500);
check("a non-owner is refused at the probe (room never opens)", await p.evaluate(() => document.getElementById("room").hidden && /not the owner/.test(document.getElementById("doorMsg").textContent)));
check("the refused attempt leaves no session behind", await p.evaluate(() => !localStorage.getItem("pace-auth-v1")));
await p.fill("#email", "owner@test.dev"); await p.fill("#pass", "owner-pw"); await p.click("#signIn"); await p.waitForTimeout(2600);
check("the owner pin opens the room", await p.evaluate(() => !document.getElementById("room").hidden));
const num = (id) => p.evaluate((i) => document.getElementById(i).textContent, id);
check("overview: joined = 3", (await num("ovJoined")) === "3");
check("overview: paying = 1", (await num("ovMoney")) === "1");
check("overview: leaving = 2 (pending + ended)", (await num("ovLeaving")) === "2");
check("weekly series renders 8 rows", await p.evaluate(() => document.querySelectorAll("#weekSeries .wk").length === 8));
await p.click('[data-sec="people"]'); await p.waitForTimeout(300);
check("people: activated = 2", (await num("pAct")) === "2");
await p.click('[data-sec="money"]'); await p.waitForTimeout(300);
check("money: pending cancels split from ended (1 / 1)", (await num("mPending")) === "1" && (await num("mEnded")) === "1");
check("money: MRR estimate reads $19.99 and labels itself", (await num("mMrr")) === "$19.99");
check("money: the cancel reason line shows", await p.evaluate(() => document.body.innerText.includes("Too busy right now")));
await p.click('[data-sec="reviews"]'); await p.waitForTimeout(300);
check("reviews: 1 total, 1 unreplied, body renders", (await num("rTotal")) === "1" && (await num("rOpen")) === "1" && (await p.evaluate(() => document.body.innerText.includes("Calm at last"))));
await p.click('[data-sec="app"]'); await p.waitForTimeout(300);
check("app panel: 42 events brought in by 2 people", (await num("aEvents")) === "42" && (await num("aImporters")) === "2");
check("no user email or name appears anywhere in the room", await p.evaluate(() => !/user@test|uid-user/.test(document.body.innerText)));
await b.close(); server.close(); mock.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
