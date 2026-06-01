import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const genDuration = new Trend('generation_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '120s', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<30000'],
    error_rate: ['rate<0.10'],
    http_req_failed: ['rate<0.10'],
  },
};

const BASE_URL = 'https://api.staging.anvila.hng14.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'paste_fallback_token_here';

const descriptions = [
  'A marketing strategist who writes SEO blog posts',
  'A DevOps engineer who automates CI/CD pipelines',
  'A customer support agent for a SaaS product',
  'A financial advisor who analyses stock portfolios',
  'A content writer specializing in B2B whitepapers',
  'A data analyst who creates dashboards and reports',
  'A sales outreach agent for cold email campaigns',
  'An HR recruiter who screens resumes',
  'A project manager who tracks sprint velocity',
  'A cybersecurity analyst who reviews access logs',
];

export default function () {
  const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  const res = http.post(`${BASE_URL}/api/v1/personas/generate`, {
    prompt: desc,
  }, {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
    timeout: '60s',
  });

  console.log('Status: ' + res.status + ' Body: ' + res.body.substring(0, 200));

  genDuration.add(res.timings.duration);
  errorRate.add(res.status !== 202);

  check(res, {
    'status is 202': (r) => r.status === 202,
    'response is JSON': (r) => { try { JSON.parse(r.body); return true; } catch (e) { return false; } },
    'response time under 30s': (r) => r.timings.duration < 30000,
    'no server crash (not 503)': (r) => r.status !== 503,
    'no timeout (not 504)': (r) => r.status !== 504,
  });
  sleep(2);
}