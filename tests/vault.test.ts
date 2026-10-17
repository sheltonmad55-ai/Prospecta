import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllVaultScripts,
  getVaultScriptsByCategory,
  searchVaultScripts,
  buildVaultPromptMatrix,
  VAULT_CATEGORIES,
} from "../src/server/vault-scripts.ts";

test("Cofre scripts database: full categories, scripts count, and search", () => {
  const all = getAllVaultScripts();
  assert.ok(all.length >= 60, `Expected at least 60 scripts, found ${all.length}`);

  // Check required core categories
  const categories = new Set(all.map((s) => s.category));
  assert.ok(categories.has("primeiro-contato"), "Missing primeiro-contato");
  assert.ok(categories.has("sem-site"), "Missing sem-site");
  assert.ok(categories.has("objecoes"), "Missing objecoes");
  assert.ok(categories.has("fechamento"), "Missing fechamento");
  assert.ok(categories.has("followup"), "Missing followup");
  assert.ok(categories.has("pos-venda"), "Missing pos-venda");

  // Validate objection scripts specifically ("está caro" and "sem dinheiro")
  const objectionScripts = getVaultScriptsByCategory("objecoes");
  assert.ok(objectionScripts.length >= 8);
  const hasCaro = objectionScripts.some(
    (s) => s.title.toLowerCase().includes("caro") || s.template.toLowerCase().includes("caro")
  );
  const hasSemDinheiro = objectionScripts.some(
    (s) => s.title.toLowerCase().includes("sem dinheiro") || s.template.toLowerCase().includes("sem dinheiro")
  );
  assert.ok(hasCaro, "Should contain 'está caro' objection handling");
  assert.ok(hasSemDinheiro, "Should contain 'sem dinheiro' objection handling");

  // Validate closing via M-Pesa / e-Mola
  const closingScripts = getVaultScriptsByCategory("fechamento");
  const hasMpesa = closingScripts.some(
    (s) => s.template.includes("M-Pesa") || s.template.includes("e-Mola")
  );
  assert.ok(hasMpesa, "Should contain M-Pesa/e-Mola in closing scripts");

  // Validate sem-site script
  const semSiteScripts = getVaultScriptsByCategory("sem-site");
  assert.ok(semSiteScripts.length >= 1);
  assert.ok(semSiteScripts[0].template.includes("Google Maps") || semSiteScripts[0].template.includes("website"));

  // Validate search function
  const resultsForCaro = searchVaultScripts("caro");
  assert.ok(resultsForCaro.length >= 2, "Search for 'caro' should return matches");

  const resultsFiltered = searchVaultScripts("M-Pesa", "fechamento");
  assert.ok(resultsFiltered.length >= 1, "Search with category filter should return matches");
});

test("Cofre dynamic prompt matrix: builds structured guidance for Gemini AI", () => {
  const matrix = buildVaultPromptMatrix();
  assert.ok(matrix.length > 500, "Matrix should be substantial");
  assert.ok(matrix.includes("M-Pesa e e-Mola"), "Matrix must mention M-Pesa and e-Mola");
  assert.ok(matrix.includes("está caro"), "Matrix must cover 'está caro'");
  assert.ok(matrix.includes("sem dinheiro"), "Matrix must cover 'sem dinheiro'");
  assert.ok(matrix.includes("sem site"), "Matrix must cover 'sem site'");
  assert.ok(matrix.includes("Moçambique"), "Matrix must reference Mozambican market context");
});
