import { expect, test } from '@playwright/test'

test.describe('SEO endpoints', () => {
  test('sitemap.xml returns 200 with xml content type', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type'] ?? '').toMatch(/xml/i)
    const body = await res.text()
    expect(body).toContain('<urlset')
    expect(body).toContain('<loc>')
  })

  test('robots.txt returns 200 with plain text and references sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/plain/i)
    const body = await res.text()
    expect(body).toMatch(/User-Agent:\s*\*/i)
    expect(body).toMatch(/Disallow:\s*\/admin\//i)
    expect(body).toMatch(/Sitemap:/i)
  })
})
