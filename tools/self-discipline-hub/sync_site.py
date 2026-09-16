#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小助理 · 本地改完即同步到 GitHub Pages 仓库（一键更新线上站点）

用法：
  # 方式 A：用环境变量传令牌（推荐，用完即清）
  set GITHUB_TOKEN=ghp_xxx
  python sync_site.py

  # 方式 B：把令牌写进本目录 .gh_token 文件（一行，不要换行）
  #         脚本会读取它；.gh_token 不会被上传到仓库，可放心放本地
  python sync_site.py

做了什么：
  1. 把 sw.js 的缓存版本 wb-app-vN 递增 +1（关键：否则手机端 Service Worker
     一直缓存旧版，你以为没更新其实是缓存没刷）
  2. 通过 GitHub Contents API 把 index.html（和版本变更后的 sw.js）推到
     xiaomin999/pwa-workbench 仓库根，覆盖线上文件
  3. GitHub Pages 1~2 分钟重建后即可在手机/电脑看到更新

注意：
  - 令牌只需要 public_repo 或 contents:write 权限，7 天过期最安全
  - 推送成功后请在 GitHub 令牌页 Revoke 作废
"""

import os, re, base64, json, urllib.request, urllib.error, sys

OWNER = "xiaomin999"
REPO = "pwa-workbench"
BRANCH = "main"
DIR = os.path.dirname(os.path.abspath(__file__))

# 需要同步到仓库的文件（index.html/sw.js 给 GitHub Pages；fetch-server.js/package.json 给 Railway 后端）
PUSH_FILES = ["index.html", "sw.js", "fetch-server.js", "package.json",
              "icon-192.png", "icon-512.png", "apple-touch-icon.png",
              "manifest.webmanifest"]

# ---------- 读取令牌 ----------
TOKEN = os.environ.get("GITHUB_TOKEN")
if not TOKEN:
    tok_path = os.path.join(DIR, ".gh_token")
    if os.path.exists(tok_path):
        with open(tok_path, "r", encoding="utf-8") as f:
            TOKEN = f.read().strip()
if not TOKEN:
    print("ERROR: 未找到 GITHUB_TOKEN。请设环境变量，或在 .gh_token 文件放一行令牌。")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "xiaozhuli-sync",
}


def bump_sw_version():
    """sw.js 的 CACHE 版本号 wb-app-vN 递增。返回 (old, new) 或 (None,None)。"""
    sw_path = os.path.join(DIR, "sw.js")
    if not os.path.exists(sw_path):
        return None, None
    txt = open(sw_path, "r", encoding="utf-8").read()
    m = re.search(r"CACHE\s*=\s*'(wb-app-v\d+)'", txt)
    if not m:
        return None, None
    old = m.group(1)
    n = int(old.replace("wb-app-v", "")) + 1
    new = f"wb-app-v{n}"
    txt = txt.replace(old, new)
    open(sw_path, "w", encoding="utf-8").write(txt)
    return old, new


def push_file(rel_path):
    local = os.path.join(DIR, rel_path)
    if not os.path.exists(local):
        print(f"跳过 {rel_path}（本地不存在）")
        return
    api = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{rel_path}"
    # 1) 取线上 SHA（更新需要）
    sha = None
    try:
        req = urllib.request.Request(f"{api}?ref={BRANCH}", headers=HEADERS)
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read().decode("utf-8"))
        sha = data.get("sha")
        print(f"  {rel_path}: 线上 SHA={sha[:8]}… 大小={data.get('size')}")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"  {rel_path}: 线上不存在，将新建")
        else:
            print(f"  {rel_path}: 读取失败 {e.code} {e.read().decode()}")
            sys.exit(1)
    # 2) 读取本地并 base64
    with open(local, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    body = {
        "message": f"sync {rel_path} via sync_site.py",
        "content": b64,
        "branch": BRANCH,
    }
    if sha:
        body["sha"] = sha
    req2 = urllib.request.Request(
        api,
        data=json.dumps(body).encode("utf-8"),
        headers={**HEADERS, "Content-Type": "application/json"},
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req2) as r:
            res = json.loads(r.read().decode("utf-8"))
        new_size = res.get("content", {}).get("size")
        print(f"  [OK] {rel_path} 已推送 commit={res.get('commit', {}).get('sha', '')[:8]} 新大小={new_size}")
    except urllib.error.HTTPError as e:
        print(f"  [ERR] {rel_path} 推送失败 {e.code} {e.read().decode()}")
        sys.exit(1)


if __name__ == "__main__":
    old, new = bump_sw_version()
    if new:
        print(f"SW 缓存版本：{old} → {new}（手机端将刷新到新版）")
    else:
        print("WARN: 未在 sw.js 找到 CACHE 版本号，跳过递增")
    print("开始同步到仓库 …")
    for fp in PUSH_FILES:
        push_file(fp)
    print("")
    print(">> 已推送到 GitHub。GitHub Pages 约 1~2 分钟重建后，")
    print("   电脑 Ctrl+Shift+R 硬刷新、手机删 PWA 重装即可看到更新。")
    print("   安全提示：推送成功后请在 GitHub 令牌页 Revoke 作废该令牌。")
