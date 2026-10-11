import * as assert from "assert";
import * as fs from "fs";
import { gunzipSync, gzipSync } from "zlib";
import { authorQuest } from "../development-tools/planned-outage";
import { writeQmm } from "../lib/qmwriter";
import { Store } from "../ui/store";
import { parse } from "../lib/qmreader";
import { QMPlayer, JUMP_I_AGREE, JUMP_GO_BACK_TO_SHIP, getGameLog, validateWinningLog } from "../lib/qmplayer";

function loadQuest() {
  return parse(gunzipSync(fs.readFileSync("src/webstatic/data/qm/PlannedOutage.qmm.gz")));
}
function play(ids: number[]) {
  const player = new QMPlayer(loadQuest(), "rus");
  player.performJump(JUMP_I_AGREE);
  for (const id of ids) {
    assert.ok(player.getState().choices.some(c => c.jumpId === id && c.active), `choice ${id} unavailable at ${player.getSaving().locationId}`);
    player.performJump(id);
  }
  return player;
}
const experiment = [101, 201, 504, 901, 1001, 1101, 1201, 1301, 1401];

describe("Плановое отключение", () => {
  it("rebuilds the shipped gzip deterministically from editable content", () => {
    assert.deepStrictEqual(gzipSync(writeQmm(authorQuest()), { level: 9 }), fs.readFileSync("src/webstatic/data/qm/PlannedOutage.qmm.gz"));
  });
  it("ships a playable Russian quest in the public catalog", () => {
    const index = JSON.parse(fs.readFileSync("src/webstatic/data/index.json", "utf8"));
    const entry = index.quests.find((q: any) => q.gameName === "Плановое отключение");
    assert.ok(entry, "new quest missing from catalog");
    const quest = parse(gunzipSync(fs.readFileSync("src/webstatic/data/" + entry.filename)));
    const player = new QMPlayer(quest, "rus");
    player.performJump(JUMP_I_AGREE);
    assert.ok(player.getState().text.includes("девять лет"));
    assert.strictEqual(player.getState().choices.length, 4);
  });
  it("actually restores temporary configuration and consent, not physical costs or external evidence", () => {
    const player = play(experiment);
    const before = player.getSaving().paramValues;
    assert.strictEqual(before[5], 1);
    assert.strictEqual(before[6], 1);
    assert.strictEqual(before[8], 1);
    player.performJump(1501);
    const after = player.getSaving().paramValues;
    assert.deepStrictEqual(after.slice(5, 8), [0, 0, 0]);
    assert.strictEqual(after[8], 1);
    assert.strictEqual(after[4], before[4]);
    assert.ok(after[1] < before[1]);
    assert.ok(after[2] > before[2]);
    assert.strictEqual(after[3], 40);
    assert.ok(player.getState().text.includes("не помнит"));
    player.performJump(1601);
    player.performJump(1701);
    assert.strictEqual(player.getSaving().locationId, 18);
  });
  it("offers four genuinely distinct complete outcomes through the real player", () => {
    const recovered = experiment.concat([1501, 1601, 1701]);
    const endings = [
      { ids: recovered.concat([1803, 1901, 2001, 2101, 2201, 2301, 2501, 2601, 2701, 2801]), title: "Живая смена", location: 32 },
      { ids: recovered.concat([1804, 2901]), title: "Последний безопасный снимок", location: 34 },
      { ids: [103, 4099, 3001, 3101], title: "Холодный выход", location: 35 },
      { ids: [104], title: "100% доступности", location: 33 },
    ];
    for (const ending of endings) {
      const player = play(ending.ids);
      assert.strictEqual(player.getSaving().locationId, ending.location);
      assert.ok(player.getState().text.includes(ending.title));
      assert.ok(player.getState().text.length > 600, "ending must contain a complete epilogue");
      player.performJump(JUMP_GO_BACK_TO_SHIP);
      assert.strictEqual(player.getState().gameState, "win");
    }
  });
  it("prevents farming trust or evidence by repeating completed observations", () => {
    const player = play([101, 201, 502, 802, 501, 601]);
    const ids = player.getState().choices.filter(c => c.active).map(c => c.jumpId);
    assert.ok(!ids.includes(502), "medic conversation must not farm trust");
    assert.ok(!ids.includes(501), "archive must not farm evidence");
    assert.ok(!ids.includes(503), "mechanical check must not farm evidence");
  });
  it("stops work when repeated real restores exhaust physical reserve, leaving a safe exit", () => {
    const player = play(experiment);
    for (let n = 0; n < 100; n++) {
      const choices = player.getState().choices.filter(c => c.active);
      const reserve = player.getSaving().paramValues[1];
      if (reserve <= 14) {
        assert.ok(choices.length > 0);
        assert.ok(choices.every(c => c.text.includes("вывести экипаж")), "exhaustion must stop work, not just hide costly tests");
        player.performJump(choices[0].jumpId);
        player.performJump(3001);
        player.performJump(3101);
        assert.strictEqual(player.getSaving().locationId, 35);
        return;
      }
      const id = player.getSaving().locationId === 15 ? 1501 : player.getSaving().locationId === 16 ? 1601 : player.getSaving().locationId === 17 ? 1701 : 1801;
      player.performJump(id);
    }
    assert.fail("physical depletion was never reached");
  });
  it("opens the restore window at zero time instead of trapping the player", () => {
    const player = play(experiment.concat([1501, 1601, 1701, 1803]));
    while (player.getSaving().paramValues[0] > 0) {
      player.performJump(1902);
      if (player.getSaving().paramValues[0] > 0) player.performJump(3601);
    }
    const choices = player.getState().choices.filter(c => c.active);
    const window = choices.find(c => c.text.includes("Дождаться окна"));
    assert.ok(window, "zero time must expose restoration, not a dead end");
    player.performJump(window!.jumpId);
    assert.strictEqual(player.getSaving().locationId, 15);
    player.performJump(1501);
    assert.strictEqual(player.getSaving().paramValues[0], 22);
  });
  it("routes the browser-encoded Russian catalog name without double-decoding user quests", () => {
    const readPath = (hash: string) => {
      const store = Object.create(Store.prototype);
      store._hash = hash;
      return store.path;
    };
    assert.strictEqual(readPath("quests/" + encodeURIComponent("Плановое отключение") + "/play").tab1, "Плановое отключение");
    assert.strictEqual(readPath("quests/Плановое отключение").tab1, "Плановое отключение");
    assert.strictEqual(readPath("quests/%broken/play").tab1, "%broken");
    assert.strictEqual(readPath("userquest/owner/name%2520literal").tab2, "name%2520literal");
    assert.strictEqual(readPath("userquest/owner%2520literal/name").tab1, "owner%2520literal");
  });
  it("keeps consent revocable and requires renewed diagnostics after a second restore", () => {
    const player = play(experiment.concat([1501, 1601, 1701, 1803, 1901, 2001, 2101, 2201, 2302]));
    assert.strictEqual(player.getSaving().paramValues[6], 0);
    assert.strictEqual(player.getSaving().paramValues[14], 1);
    assert.ok(!player.getState().choices.some(c => c.jumpId === 2701));
    player.performJump(2401);
    player.performJump(2201);
    player.performJump(2303);
    const evidence = player.getSaving().paramValues[4];
    player.performJump(1501);
    assert.deepStrictEqual(player.getSaving().paramValues.slice(5, 8), [0, 0, 0]);
    assert.strictEqual(player.getSaving().paramValues[4], evidence);
    player.performJump(1601);
    player.performJump(1701);
    player.performJump(1803);
    assert.ok(!player.getState().choices.some(c => c.jumpId === 1901), "repeating diagnostics must not farm evidence");
    player.performJump(1903);
    player.performJump(2003);
    player.performJump(2101);
    player.performJump(2201);
    player.performJump(2301);
    player.performJump(2501);
    player.performJump(2601);
    player.performJump(2701);
    player.performJump(2801);
    assert.strictEqual(player.getSaving().locationId, 32);
  });
  it("can reconstruct a missing external packet without inventing memories or evidence", () => {
    const player = play([103, 401, 1001, 1101, 1201, 1302, 1501, 1601, 1701, 1803]);
    const before = player.getSaving().paramValues[4];
    assert.strictEqual(player.getSaving().paramValues[8], 0);
    player.performJump(1904);
    assert.strictEqual(player.getSaving().paramValues[8], 1);
    assert.strictEqual(player.getSaving().paramValues[4], before);
  });
  it("round-trips a JSON save and validates the actual winning jump log", () => {
    const player = play(experiment.concat([1501, 1601, 1701]));
    const saved = JSON.parse(JSON.stringify(player.getSaving()));
    const restored = new QMPlayer(loadQuest(), "rus");
    restored.loadSaving(saved);
    assert.deepStrictEqual(restored.getState(), player.getState());
    for (const id of [1804, 2901, JUMP_GO_BACK_TO_SHIP]) {
      player.performJump(id);
      restored.performJump(id);
    }
    assert.deepStrictEqual(restored.getState(), player.getState());
    assert.ok(validateWinningLog(loadQuest(), getGameLog(restored.getSaving())));
    const log = getGameLog(restored.getSaving());
    assert.ok(!validateWinningLog(loadQuest(), { ...log, performedJumps: log.performedJumps.slice(0, -2) }));
  });
  it("keeps the initial investigation hub to at most five understandable choices", () => {
    const player = play([103, 402]);
    assert.ok(player.getState().choices.filter(c => c.active).length <= 5);
  });
  it("makes the physical reserve stop explicit in the visible resource panel", () => {
    const player = play(experiment);
    for (let n = 0; n < 100 && player.getSaving().paramValues[1] > 14; n++) {
      const id = player.getSaving().locationId === 15 ? 1501 : player.getSaving().locationId === 16 ? 1601 : player.getSaving().locationId === 17 ? 1701 : 1801;
      player.performJump(id);
    }
    assert.ok(player.getState().paramsState.some(p => p.includes("только эвакуация")));
  });
  it("has no dangling graph or parameter references and substantial scenes", () => {
    const quest = loadQuest();
    const locations = new Set(quest.locations.map(l => l.id));
    assert.strictEqual(locations.size, 37);
    assert.strictEqual(new Set(quest.jumps.map(j => j.id)).size, quest.jumps.length);
    assert.strictEqual(quest.locations.filter(l => l.isStarting).length, 1);
    assert.strictEqual(quest.locations.filter(l => l.isSuccess).length, 4);
    assert.strictEqual(quest.params.filter(p => p.showingInfo.length > 0).length, 5);
    const reached = new Set<number>([1]);
    for (let n = 0; n < quest.locations.length; n++) for (const jump of quest.jumps) {
      assert.ok(locations.has(jump.fromLocationId) && locations.has(jump.toLocationId));
      assert.strictEqual(jump.paramsConditions.length, quest.params.length);
      assert.strictEqual(jump.paramsChanges.length, quest.params.length);
      for (const formula of [jump.formulaToPass, ...jump.paramsChanges.map(p => p.changingFormula)]) {
        for (const match of formula.match(/\[p\d+\]/g) || []) assert.ok(Number(match.slice(2, -1)) <= quest.params.length);
      }
      if (reached.has(jump.fromLocationId)) reached.add(jump.toLocationId);
    }
    assert.strictEqual(reached.size, locations.size);
    for (const location of quest.locations) assert.ok(location.texts[0].length > 300, `thin scene ${location.id}`);
  });
});


