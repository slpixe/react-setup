import { test as base, expect } from '@playwright/test'

type AutomaticFixtures = { autoTestSetup: void }

export const test = base.extend<AutomaticFixtures>({
  autoTestSetup: [
    async ({}, use) => {
      // Put setup before use() and teardown after it. This fixture runs for every
      // test that imports { test } from this module.
      await use()
    },
    { auto: true },
  ],
})

export { expect }
