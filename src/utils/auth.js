export async function login(password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
  return res.ok
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
}

export async function checkAuth() {
  const res = await fetch('/api/auth/me')
  return res.ok
}
