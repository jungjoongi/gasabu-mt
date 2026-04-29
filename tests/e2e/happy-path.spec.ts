import { test, expect } from '@playwright/test'

const ADMIN_PWD = process.env.ADMIN_PASSWORD ?? 'change-me'

test.describe('잃어버린 13지파의 후예 — 해피패스', () => {
  test('스플래시 → 등록 → Play 화면 진입', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('잃어버린 13지파의 후예')).toBeVisible()
    await page.getByRole('link', { name: '시작하기' }).click()

    await expect(page).toHaveURL(/\/register/)
    await page.getByPlaceholder(/예: 김씨네/).fill('E2E김씨네')
    await page.getByRole('button', { name: '입장하기' }).click()

    await expect(page).toHaveURL(/\/play/)
    await expect(page.getByText('E2E김씨네')).toBeVisible()
    await expect(page.getByText('🔮 음해자의 흔적')).toBeVisible()
  })

  test('보물 스캔 → 정답 입력 → 우승 (KV 환경 필요)', async ({ page, request }) => {
    test.skip(!process.env.E2E_TREASURE_UUID, 'set E2E_TREASURE_UUID env to run full path')

    await request.post('/api/admin/start-game', {
      headers: { 'x-admin-password': ADMIN_PWD },
    })

    await page.goto('/')
    await page.getByRole('link', { name: '시작하기' }).click()
    await page.getByPlaceholder(/예: 김씨네/).fill('E2E우승가족')
    await page.getByRole('button', { name: '입장하기' }).click()

    await page.goto(`/scan/${process.env.E2E_TREASURE_UUID}`)
    await expect(page.getByText(/보물을 찾았습니다|이미/)).toBeVisible()
    await page.getByRole('link', { name: '메인으로' }).click()

    await page.getByRole('button', { name: /정답 입력/ }).click()
    await page.getByPlaceholder(/이름을 입력|음해자/).fill('하만')
    await page.getByRole('button', { name: '제출' }).click()

    await expect(page.getByText('게임 종료!')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('하만')).toBeVisible()
  })
})
