"""
生成测试数据：
  - 20 通道 × 20kHz × 60s
  - 保存为 data/test_20ch_20k_60s.npy (shape: 20 × 1200000, float32)
  - 附带 data/test_20ch_20k_60s.meta.json
"""
import json
from pathlib import Path
import numpy as np

FS = 20_000
DUR = 60
N_CH = 20
N = FS * DUR

out_dir = Path(__file__).resolve().parent.parent / "data"
out_dir.mkdir(exist_ok=True)

rng = np.random.default_rng(0)
data = np.zeros((N_CH, N), dtype=np.float32)
t = np.arange(N) / FS

for i in range(N_CH):
    f0 = 200 + i * 150
    sig = 0.1 * np.sin(2 * np.pi * f0 * t)
    # 15–20s、45–48s 注入大信号
    sig[(t > 15) & (t < 20)] += 0.7 * np.sin(2 * np.pi * (f0 + 50) * t[(t > 15) & (t < 20)])
    sig[(t > 45) & (t < 48)] += 0.4 * np.sin(2 * np.pi * (f0 + 100) * t[(t > 45) & (t < 48)])
    sig += rng.normal(0, 0.01, N).astype(np.float32)
    data[i] = sig

npy_path = out_dir / "test_20ch_20k_60s.npy"
np.save(npy_path, data)

meta = {
    "fs": FS,
    "channels": [{"id": i, "name": f"CH{i+1}"} for i in range(N_CH)],
    "duration": DUR,
    "nSamples": N,
}
meta_path = out_dir / "test_20ch_20k_60s.meta.json"
meta_path.write_text(json.dumps(meta, indent=2))

print(f"✅ 已生成：{npy_path}  ({data.nbytes/1e6:.1f} MB)")
print(f"✅ 已生成：{meta_path}")