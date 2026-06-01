import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const registryDuration = new Trend('registry_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '60s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    error_rate: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'https://api.staging.anvila.hng14.com';

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/explore?page=1&size=20`);

  registryDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response is JSON': (r) => { try { JSON.parse(r.body); return true; } catch (e) { return false; } },
    'response time under 500ms': (r) => r.timings.duration < 500,
    'response time under 1s': (r) => r.timings.duration < 1000,
  });
  sleep(0.5);
}
