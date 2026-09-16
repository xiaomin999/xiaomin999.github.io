/*
 * 雅思学习平台 · 一键部署到 GitHub Pages
 * 用法（Windows PowerShell 或 CMD，在该文件夹下执行）：
 *   node deploy.js
 * 说明：
 *   - Token 取自环境变量 GITHUB_TOKEN，否则取项目约定路径下的 .gh_token 文件
 *   - 仅推送 index.html 到 xiaomin999/ielts-platform 仓库 main 分支
 *   - 仓库已设为公开（GitHub 免费账号只能从公开仓库发布 Pages）
 */
const fs = require('fs');
const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN ||
  fs.readFileSync('C:\\Users\\bonsen\\WorkBuddy\\workbuddy工作空间\\个人全能自律工作台\\.gh_token', 'utf8').trim();
const OWNER = 'xiaomin999';
const REPO = 'ielts-platform';
const FILE = 'index.html';
const BRANCH = 'main';
const API = 'api.github.com';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: API, path, method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'ielts-platform-deploy',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, resp => {
      let s = '';
      resp.on('data', d => s += d);
      resp.on('end', () => resolve({ status: resp.statusCode, body: s }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const content = fs.readFileSync(FILE).toString('base64');
  const cur = await req('GET', `/repos/${OWNER}/${REPO}/contents/${FILE}`);
  const sha = JSON.parse(cur.body).sha;
  const put = await req('PUT', `/repos/${OWNER}/${REPO}/contents/${FILE}`,
    { message: 'update ielts platform', content, branch: BRANCH, sha });
  console.log('deploy index.html ->', put.status === 200 ? 'OK (已更新)' : ('FAIL ' + put.status));
  if (put.status !== 200) console.log(put.body.slice(0, 300));
})();
