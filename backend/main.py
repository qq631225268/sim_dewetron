"""
FastAPI 契约 + 最小实现（含 mock 二进制响应）。
DSP 部分用 TODO 标出，先返回合成数据，保证前端链路可跑通。
"""
import io
import json
import uuid
from pathlib import Path
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, File, UploadFile, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Spectrum Analyzer API")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
    expose_headers=["X-Channels", "X-FftSize", "X-FreqStart", "X-FreqStep", "X-Dtype", "X-Scale", "X-DbRef"],
)

DATA_DIR = Path("./data")
DATA_DIR.mkdir(exist_ok=True)

# 内存注册表：fileId -> 文件路径 + meta
FILES: dict = {}


class FilterCfg(BaseModel):
    type: str
    fc1: float = 0
    fc2: float = 0
    order: int = 4
    zeroPhase: bool = True


class SpectrumReq(BaseModel):
    channels: List[int]
    t: float
    fftSize: int
    window: str
    scale: str
    dbRef: str
    filter: Optional[FilterCfg] = None


@app.post("/api/files/upload")
async def upload(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    dst = DATA_DIR / f"{file_id}_{file.filename}"
    content = await file.read()
    dst.write_bytes(content)
    FILES[file_id] = {"path": str(dst), "name": file.filename}
    return {"fileId": file_id, "fileName": file.filename}


@app.get("/api/files/{file_id}/meta")
def meta(file_id: str):
    if file_id not in FILES:
        raise HTTPException(404, "file not found")
    f = FILES[file_id]
    # TODO: 根据真实格式解析 npy/wav 等
    try:
        arr = np.load(f["path"], mmap_mode="r")
        n_ch, n_samples = arr.shape
    except Exception:
        # 回退：假装 20 ch / 60s / 20kHz
        n_ch, n_samples = 20, 20_000 * 60
    fs = 20000
    return {
        "channels": [{"id": i, "name": f"CH{i+1}"} for i in range(n_ch)],
        "fs": fs,
        "duration": n_samples / fs,
        "nSamples": int(n_samples),
    }


@app.get("/api/files/{file_id}/waveform")
def waveform(file_id: str, ch: int, points: int = 1000):
    if file_id not in FILES:
        raise HTTPException(404, "file not found")
    # TODO: 从 npy 读并做 min/max 降采样
    # 占位实现：生成符合形状的假包络
    t = np.linspace(0, 60, points)
    base = np.sin(t * 0.8) * 0.1
    burst = np.where((t > 15) & (t < 20), 0.7, 0.0)
    rng = np.random.default_rng(ch)
    noise = rng.uniform(0, 0.02, points)
    mn = (base - burst - noise).tolist()
    mx = (base + burst + noise).tolist()
    return {"t": t.tolist(), "min": mn, "max": mx, "t0": 0, "dt": t[1] - t[0]}


@app.post("/api/files/{file_id}/spectrum")
def spectrum(file_id: str, req: SpectrumReq):
    if file_id not in FILES:
        raise HTTPException(404, "file not found")
    n_ch = len(req.channels)
    bins = req.fftSize // 2 + 1
    # TODO: 真正读数据 + 窗口 + FFT + 滤波 + dB
    out = np.zeros((n_ch, bins), dtype=np.float32)
    rng = np.random.default_rng(int(req.t * 1000))
    for i, ch in enumerate(req.channels):
        f0 = 200 + ch * 150
        freqs = np.linspace(0, 10000, bins)
        db = -100 + rng.uniform(0, 3, bins)
        db = np.where(np.abs(freqs - f0) < 25, -30, db)
        db = np.where(np.abs(freqs - 3000) < 40, -50, db)
        out[i] = db

    # 响应头 + channel-major Float32 body
    headers = {
        "X-Channels": str(n_ch),
        "X-FftSize": str(req.fftSize),
        "X-FreqStart": "0",
        "X-FreqStep": str(10000 / (bins - 1)),
        "X-Dtype": "float32",
        "X-Scale": req.scale,
        "X-DbRef": req.dbRef,
    }
    return Response(
        content=out.tobytes(),
        media_type="application/octet-stream",
        headers=headers,
    )