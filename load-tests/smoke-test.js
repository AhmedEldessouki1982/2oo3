import { check } from 'k6'
import http from 'k6/http'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api'
const EMAIL = __ENV.USER_EMAIL || `loadtest-${Date.now()}@example.com`
const PASSWORD = __ENV.USER_PASSWORD || 'Test123!'

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  // 1. Register user
  const registerRes = http.post(`${BASE_URL}/auth/register`, {
    email: EMAIL,
    password: PASSWORD,
    displayName: 'Load Test User',
  })
  check(registerRes, {
    'register succeeded': (r) => r.status === 201 || r.status === 409,
  })

  // 2. Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, {
    email: EMAIL,
    password: PASSWORD,
  })
  check(loginRes, {
    'login succeeded': (r) => r.status === 201,
  })

  const token = loginRes.json('accessToken')
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // 3. List conversations
  const listRes = http.get(`${BASE_URL}/conversations?page=1&limit=20`, { headers })
  check(listRes, {
    'list conversations ok': (r) => r.status === 200,
  })

  // 4. Create conversation (COMMISSIONING)
  const createRes = http.post(
    `${BASE_URL}/conversations`,
    { title: 'Load test investigation', type: 'COMMISSIONING' },
    { headers },
  )
  check(createRes, {
    'create conversation ok': (r) => r.status === 201,
  })

  const conversationId = createRes.json('data.id')

  if (conversationId) {
    // 5. Send message
    const msgRes = http.post(
      `${BASE_URL}/conversations/${conversationId}/messages`,
      { content: 'Analyze the vibration data from GT-1 during first fire' },
      { headers },
    )
    check(msgRes, {
      'send message ok': (r) => r.status === 201,
    })

    const messageId = msgRes.json('data.message.id')

    if (messageId) {
      // 6. Get comparison a bit later
      const compRes = http.get(
        `${BASE_URL}/comparisons/${messageId}`,
        { headers },
      )
      check(compRes, {
        'get comparison ok': (r) => r.status === 200,
      })
    }

    // 7. Get conversation detail
    const convRes = http.get(
      `${BASE_URL}/conversations/${conversationId}?messagesLimit=5`,
      { headers },
    )
    check(convRes, {
      'get conversation ok': (r) => r.status === 200,
    })
  }
}
