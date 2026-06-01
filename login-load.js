import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '60s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    error_rate: ['rate<0.05'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = 'https://api.staging.anvila.hng14.com';

export default function () {
  const payload = JSON.stringify({
    email: 'ugoamara409@gmail.com',
    password: '2fwbY3H5TwAPzkX>',
  });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);

  loginDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response is JSON': (r) => { try { JSON.parse(r.body); return true; } catch (e) { return false; } },
    'response has success field': (r) => { try { return JSON.parse(r.body).success !== undefined; } catch (e) { return false; } },
    'response time under 2s': (r) => r.timings.duration < 2000,
  });
  sleep(1);
}
