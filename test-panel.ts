import { FPCCCore } from './src/services/fpcc-core';

async function test() {
  console.log("⏳ Contacting the expert panel...");
  const response = await FPCCCore.runPanel({
    title: "Connection Test",
    description: "Respond with exactly the phrase: 'Panel is active and fully operational.'"
  });
  console.log("\n💬 Response from Hermes:\n", response);
}

test();
// File compiled cleanly
