import { check, sleep } from 'k6'
import http from 'k6/http'
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api'

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
  },
}

const userPool = Array.from({ length: 20 }, (_, i) => ({
  email: `load-${i}-${Date.now()}@example.com`,
  password: 'Test123!',
}))

let tokenCache: string[] = []

export function setup() {
  const tokens: string[] = []
  for (const user of userPool) {
    const registerRes = http.post(`${BASE_URL}/auth/register`, {
      email: user.email,
      password: user.password,
      displayName: `Load Test User ${user.email}`,
    })

    let token: string
    if (registerRes.status === 201) {
      token = registerRes.json('data.accessToken')
    } else {
      const loginRes = http.post(`${BASE_URL}/auth/login`, {
        email: user.email,
        password: user.password,
      })
      token = loginRes.json('data.accessToken')
    }

    if (token) tokens.push(token)
  }
  return { tokens }
}

export default function (data: { tokens: string[] }) {
  const token = data.tokens[__VU - 1] ?? data.tokens[0]
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // 1. List conversations
  http.get(`${BASE_URL}/conversations?page=1&limit=20`, { headers })

  // 2. Create conversation
  const createRes = http.post(
    `${BASE_URL}/conversations`,
    { title: `Load test ${randomString(8)}`, type: 'COMMISSIONING' },
    { headers },
  )
  check(createRes, {
    'conversation created': (r) => r.status === 201,
  })

  const convId = createRes.json('data.id')
  if (convId) {
    // 3. Send message
    const msgRes = http.post(
      `${BASE_URL}/conversations/${convId}/messages`,
      { content: `What are the commissioning risks for ${randomString(10)}?` },
      { headers },
    )
    check(msgRes, {
      'message sent': (r) => r.status === 201,
    })
  }

  sleep(Math.random() * 2 + 1)
}
