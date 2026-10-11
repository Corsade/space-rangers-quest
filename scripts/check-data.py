"""Validate the bundled public-site snapshot; prepare the upstream quest tests."""
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/webstatic/data"
index = json.loads((DATA / "index.json").read_text())
paths = set()
for group in index["dir"].values():
    assert sum(file["size"] for file in group["files"]) == group["totalSize"]
    for file in group["files"]:
        relative = file["filePath"] + file["fileName"]
        path = (DATA / relative).resolve()
        assert path.is_relative_to(DATA.resolve()), relative
        assert relative not in paths, relative
        paths.add(relative)
        assert path.stat().st_size == file["size"], relative
assert {q["filename"] for q in index["quests"]} == {
    f["filePath"] + f["fileName"] for f in index["dir"]["quests"]["files"]
}
raw_dir = ROOT / "borrowed/qm/Online"
raw_dir.mkdir(parents=True, exist_ok=True)
for quest in index["quests"]:
    path = DATA / quest["filename"]
    assert path.suffix == ".gz"
    (raw_dir / path.stem).write_bytes(gzip.decompress(path.read_bytes()))
print(f"OK: {len(index['quests'])} quests, {len(paths)} assets, all sizes and gzip streams valid")
