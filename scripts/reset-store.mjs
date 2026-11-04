// Wist de lokale opslag; bij de volgende start wordt ze opnieuw gevuld uit fixtures/demo.json.
import fs from "node:fs";

const file = new URL("../data/store.json", import.meta.url);
if (fs.existsSync(file)) {
  fs.rmSync(file);
  console.log("data/store.json gewist.");
} else {
  console.log("Niets te wissen.");
}
