import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp-up to 50 VUs
    { duration: '20s', target: 200 }, // Sustain 200 VUs high concurrency
    { duration: '10s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    http_req_duration: ['p(95)<100'], // 95% of requests must complete under 100ms
  },
};

let loggedError = false;

export default function () {
  const apiKey = __ENV.API_KEY || 'ff_production_demo_key_123456789';
  const flagKey = __ENV.FLAG_KEY || 'checkout_v2';
  const userId = `load_user_${Math.floor(Math.random() * 100000)}`;

  const url = http.url`http://localhost:4000/api/v1/evaluate/${flagKey}?country=IN`;

  const params = {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-User-Key': userId,
      'Accept': 'application/json',
    },
  };

  const res = http.get(url, params);

  if (res.status !== 200 && !loggedError) {
    loggedError = true;
    console.log(`[K6 ERROR DETECTED] Status: ${res.status}, Body: ${res.body}`);
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has flagKey': (r) => r.json() && r.json().flagKey === flagKey,
    'has enabled boolean': (r) => r.json() && typeof r.json().enabled === 'boolean',
  });

  sleep(0.01);
}
