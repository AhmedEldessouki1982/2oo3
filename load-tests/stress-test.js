import { check, sleep } from 'k6'
import http from 'k6/http'
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api'

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<8000'],
    http_req_failed: ['rate<0.10'],
  },
}

const userPool = Array.from({ length: 100 }, (_, i) => ({
  email: `stress-${i}-${Date.now()}@example.com`,
  password: 'Test123!',
}))

export function setup() {
  const tokens: string[] = []
  for (const user of userPool.slice(0, 50)) {
    const loginRes = http.post(`${BASE_URL}/auth/login`, {
      email: user.email,
      password: user.password,
    })
    if (loginRes.status === 201) {
      tokens.push(loginRes.json('data.accessToken'))
    } else {
      const regRes = http.post(`${BASE_URL}/auth/register`, {
        email: user.email,
        password: user.password,
        displayName: `Stress User ${user.email}`,
      })
      if (regRes.status === 201 || regRes.status === 409) {
        const retryLogin = http.post(`${BASE_URL}/auth/login`, {
          email: user.email,
          password: user.password,
        })
        if (retryLogin.status === 201) {
          tokens.push(retryLogin.json('data.accessToken'))
        }
      }
    }
  }
  return { tokens }
}

export default function (data: { tokens: string[] }) {
  const token = data.tokens[__VU % data.tokens.length]
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // Mix of read and write operations
  const isRead = Math.random() < 0.4

  if (isRead) {
    http.get(`${BASE_URL}/conversations?page=1&limit=20`, { headers })
    http.get(`${BASE_URL}/health`, { headers })
  } else {
    const createRes = http.post(
      `${BASE_URL}/conversations`,
      { title: `Stress test ${randomString(6)}`, type: Math.random() > 0.5 ? 'COMMISSIONING' : 'CHAT' },
      { headers },
    )
    if (createRes.status === 201) {
      const convId = createRes.json('data.id')
      if (convId) {
        http.post(
          `${BASE_URL}/conversations/${convId}/messages`,
          { content: `Emergency: ${randomString(20)} failure analysis` },
          { headers },
        )
      }
    }
  }

  sleep(Math.random() * 0.5 + 0.1)
}
