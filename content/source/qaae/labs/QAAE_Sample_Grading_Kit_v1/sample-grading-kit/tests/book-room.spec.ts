import { test, expect } from '@playwright/test';

test('a member can book a free meeting room', async ({ page }) => {
  await page.goto('http://127.0.0.1:4420/rooms');
  await page.getByRole('link', { name: 'Harbour Room' }).click();

  await page.getByLabel('Date').fill('2026-12-01');
  await page.getByLabel('Start time').fill('10:00');
  await page.getByLabel('End time').fill('12:00');
  await page.getByRole('button', { name: 'Book this room' }).click();

  await expect(page.getByRole('heading', { name: 'Booking confirmed' })).toBeVisible();
});
