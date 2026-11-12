'use strict';

var crypto = require('crypto');

function sendError(res, status, message) {
  res.status(status).json({ message: message });
}

function settings() {
  var owner = process.env.GITHUB_OWNER || 'Xeryus01';
  var repo = process.env.GITHUB_REPO || 'Planner';
  var branch = process.env.GITHUB_BRANCH || 'main';
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not configured in Vercel.');
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo) || !branch) {
    throw new Error('GitHub repository settings are invalid.');
  }
  return { owner: owner, repo: repo, branch: branch, token: process.env.GITHUB_TOKEN };
}

async function githubFile(config, method, data, sha) {
  var url = 'https://api.github.com/repos/' + encodeURIComponent(config.owner) + '/' +
    encodeURIComponent(config.repo) + '/contents/data.json';
  if (method === 'GET') url += '?ref=' + encodeURIComponent(config.branch);
  var headers = {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + config.token,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Planner-Vercel-API'
  };
  var options = { method: method, headers: headers };
  if (method === 'PUT') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify({
      message: 'Update planner data',
      content: Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64'),
      sha: sha,
      branch: config.branch
    });
  }
  var response = await fetch(url, options);
  var result;
  try { result = await response.json(); } catch (e) { result = {}; }
  if (!response.ok) {
    var status = response.status === 409 ? 409 : response.status === 404 ? 404 : 502;
    var message = response.status === 409 ? 'Data changed concurrently; retry the sync.' :
      response.status === 404 ? 'data.json was not found on the configured GitHub branch.' :
      'GitHub API request failed: ' + (result.message || response.status);
    var error = new Error(message);
    error.status = status;
    throw error;
  }
  return result;
}

function validData(data) {
  return !!data && typeof data === 'object' &&
    (Array.isArray(data.plans) ||
      (data.v === 1 && typeof data.i === 'string' && typeof data.c === 'string'));
}

function passwordMatches(provided, expected) {
  if (typeof provided !== 'string' || !expected) return false;
  var a = Buffer.from(provided);
  var b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return sendError(res, 405, 'Method not allowed.');
  }

  var config;
  try { config = settings(); }
  catch (e) { return sendError(res, 503, e.message); }

  if (req.method === 'GET') {
    try {
      var file = await githubFile(config, 'GET');
      if (!file.content || file.encoding !== 'base64') return sendError(res, 502, 'GitHub returned an unsupported data.json format.');
      var data = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
      return res.status(200).json(data);
    } catch (e) {
      return sendError(res, e.status || 502, e.message || 'Unable to read data.json from GitHub.');
    }
  }

  var authorization = req.headers.authorization || '';
  var providedPassword = authorization.indexOf('Bearer ') === 0 ? authorization.slice(7) : '';
  if (!passwordMatches(providedPassword, process.env.SYNC_PASSWORD)) {
    return sendError(res, process.env.SYNC_PASSWORD ? 401 : 503, 'Invalid or missing SYNC_PASSWORD.');
  }

  var payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); }
    catch (e) { return sendError(res, 400, 'Request body must be valid JSON.'); }
  }
  if (!validData(payload)) return sendError(res, 400, 'Expected planner data with a plans array or encrypted payload.');
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 1024 * 1024) {
    return sendError(res, 413, 'Planner data exceeds the 1 MB limit.');
  }

  try {
    var current = await githubFile(config, 'GET');
    var updated = await githubFile(config, 'PUT', payload, current.sha);
    return res.status(200).json({ ok: true, commit: updated.commit && updated.commit.sha });
  } catch (e) {
    return sendError(res, e.status || 502, e.message || 'Unable to save data.json to GitHub.');
  }
};
