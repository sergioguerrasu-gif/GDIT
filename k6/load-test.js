import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Uso:
//   BASE_URL=http://<alb_dns_name> k6 run k6/load-test.js
//
// Perfil: calentamiento -> carga normal -> pico -> enfriamiento.
// /api/load gasta CPU a proposito (LOAD_MS ms por peticion) para saturar las
// instancias t3.micro y ver el escalado del ASG y la distribucion del ALB.

const BASE_URL = __ENV.BASE_URL;
const LOAD_MS = __ENV.LOAD_MS || '30';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // calentamiento
    { duration: '1m', target: 50 },   // carga normal
    { duration: '1m30s', target: 150 }, // pico: busca saturacion
    { duration: '30s', target: 0 },   // enfriamiento
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],       // menos de 5% de errores
    http_req_duration: ['p(95)<1500'],    // p95 bajo 1.5 s
    checks: ['rate>0.95'],
  },
};

const loadLatency = new Trend('latency_api_load', true);

export function setup() {
  if (!BASE_URL) {
    throw new Error('Define BASE_URL, ej: BASE_URL=http://mi-alb.us-east-1.elb.amazonaws.com');
  }
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`/health devolvio ${res.status}: el servicio no esta listo`);
  }
}

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const load = http.get(`${BASE_URL}/api/load?ms=${LOAD_MS}`);
  loadLatency.add(load.timings.duration);
  check(load, {
    'load 200': (r) => r.status === 200,
    'load < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(0.5);
}
