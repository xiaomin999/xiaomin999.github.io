# -*- coding: utf-8 -*-
"""
一键把 tools-hub 部署到 GitHub Pages 根站（xiaomin999.github.io）。

用法（本机任意 PowerShell / Git Bash 窗口）：
    set GITHUB_TOKEN=ghp_xxx        # PowerShell 用 $env:GITHUB_TOKEN="ghp_xxx"
    python deploy.py

脚本做的事：
  1. 建仓库 <user>.github.io（已存在则跳过）
  2. 本地 git init + commit
  3. 用一次性 token URL 推送（token 不落盘）
  4. 开启 Pages
  5. 等待并验证线上地址
"""
import os, sys, io, json, time, subprocess, urllib.request, urllib.error

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

USER = "xiaomin999"
REPO = f"{USER}.github.io"
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = BASE  # deploy.py 就放在站点根目录，仓库根即站点根
API = "https://api.github.com"


def token():
    t = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not t:
        print("!! 没找到 token。请先设置环境变量 GITHUB_TOKEN")
        print("   PowerShell:  $env:GITHUB_TOKEN=\"ghp_xxxx\"")
        print("   Git Bash:    export GITHUB_TOKEN=ghp_xxxx")
        sys.exit(1)
    return t.strip()


def api(method, path, tok, body=None):
    req = urllib.request.Request(
        API + path,
        method=method,
        headers={
            "Authorization": "Bearer " + tok,
            "Accept": "application/vnd.github+json",
            "User-Agent": "tools-hub-deploy",
            "Content-Type": "application/json",
        },
        data=json.dumps(body).encode() if body else None,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="ignore")
        try:
            return e.code, json.loads(raw or "{}")
        except Exception:
            return e.code, {"raw": raw}


def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                       encoding="utf-8", errors="ignore", shell=isinstance(cmd, str), **kw)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def sanitize(s):
    return s.replace(TOK, "***") if TOK else s


TOK = token()
print("==> 校验 token")
st, me = api("GET", "/user", TOK)
if st != 200:
    print("  token 无效:", st, me.get("message"))
    sys.exit(1)
login = me.get("login")
print("  已登录:", login)
if login.lower() != USER.lower():
    print(f"  !! 警告：token 属于 {login}，预期 {USER}")
    ans = input("  继续？(y/N) ").strip().lower()
    if ans != "y":
        sys.exit(1)

print(f"==> 建仓库 {REPO}")
st, res = api("POST", "/user/repos", TOK, {
    "name": REPO,
    "description": "个人工具门户：所有自建工具的统一入口",
    "public": True,
    "has_issues": False,
    "has_wiki": False,
})
if st == 201:
    print("  已创建:", res.get("full_name"))
elif st == 422:
    print("  仓库已存在，跳过")
else:
    print("  失败:", st, res.get("message"))
    sys.exit(1)

print("==> 本地 git 初始化")
run(["git", "init", "-q"])
run(["git", "config", "user.name", USER])
run(["git", "config", "user.email", f"{USER}@users.noreply.github.com"])
run(["git", "add", "-A"])
code, out = run(["git", "commit", "-m", "init: 工具门户 + 11 个本地工具站"])
print("  commit:", "ok" if code == 0 else out.strip().splitlines()[-1][:100])
run(["git", "branch", "-M", "main"])

print("==> 推送")
code, out = run(["git", "push", f"https://{TOK}@github.com/{USER}/{REPO}.git", "main", "--force"])
print("  ", "成功" if code == 0 else "失败")
if code != 0:
    print(sanitize(out)[-600:])
    sys.exit(1)
run(["git", "remote", "remove", "origin"])
run(["git", "remote", "add", "origin", f"https://github.com/{USER}/{REPO}.git"])

print("==> 开启 Pages")
st, res = api("POST", f"/repos/{USER}/{REPO}/pages", TOK,
              {"source": {"branch": "main", "path": "/"}})
if st in (201, 409):
    print("  已开启" if st == 201 else "  已开启过")
elif st == 422:
    st2, res2 = api("PUT", f"/repos/{USER}/{REPO}/pages", TOK,
                    {"source": {"branch": "main", "path": "/"}})
    print("  更新配置:", st2)
else:
    print("  ", st, res.get("message"))

url = f"https://{USER}.github.io/"
print("==> 等待发布（首次构建 1-2 分钟）")
for i in range(12):
    time.sleep(20)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "check"})
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode("utf-8", "ignore")
        if "我的工具箱" in body:
            print(f"  上线成功 -> {url}")
            break
        print(f"  [{i+1}] 200 但内容未就绪")
    except Exception as e:
        print(f"  [{i+1}] 尚未就绪 ({str(e)[:50]})")
else:
    print("  仍未见效，稍等几分钟后手动打开:", url)

print()
print("完成。门户地址:", url)
