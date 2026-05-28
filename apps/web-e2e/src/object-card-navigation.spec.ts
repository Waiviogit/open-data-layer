import { expect, test } from '@playwright/test';

const MOCK_OBJECT_NAME = 'E2E Mock Tofu Object';

const MOCK_DISCOVER_OBJECT = {
  object_id: 'e2e-mock-tofu',
  object_type: 'dish',
  semantic_type: null,
  weight: 1.217,
  fields: {
    name: MOCK_OBJECT_NAME,
    description: '(Spicy) Fish flakes',
  },
  hasAdministrativeAuthority: false,
  hasOwnershipAuthority: false,
};

test.describe('ObjectCard navigation', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/discover/objects**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [MOCK_DISCOVER_OBJECT],
          cursor: null,
          hasMore: false,
        }),
      });
    });

    await page.route('**/api/discover/tag-categories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: [] }),
      });
    });
  });

  test('clicking the object title navigates to the object page', async ({ page }) => {
    await page.goto('/discover?type=hashtag');

    const titleLink = page.getByRole('link', { name: MOCK_OBJECT_NAME, exact: true });
    await expect(titleLink).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/object\/e2e-mock-tofu/, { timeout: 15_000 }),
      titleLink.click(),
    ]);
  });

  test('clicking the object thumbnail navigates to the object page', async ({ page }) => {
    await page.goto('/discover?type=hashtag');

    const thumbLink = page.getByRole('link', { name: `View object: ${MOCK_OBJECT_NAME}` });
    await expect(thumbLink).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/object\/e2e-mock-tofu/, { timeout: 15_000 }),
      thumbLink.click(),
    ]);
  });
});
