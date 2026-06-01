import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const spikeErrors = new Counter('spike_errors');
const spikeDuration = new Trend('spike_duration', true);

export const options = {
  stages: [
    { duration: '5s', target: 0 },
    { duration: '10s', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '5s', target: 0 },
    { duration: '30s', target: 5 },
  ],
  thresholds: {
    error_rate: ['rate<0.20'],
    http_req_failed: ['rate<0.20'],
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

  spikeDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);
  if (res.status !== 200) { spikeErrors.add(1); }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'not a server crash (not 503)': (r) => r.status !== 503,
    'not a gateway timeout (not 504)': (r) => r.status !== 504,
    'response time under 5s': (r) => r.timings.duration < 5000,
  });
  sleep(0.5);
}
