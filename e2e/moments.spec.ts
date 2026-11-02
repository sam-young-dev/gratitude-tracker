import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import 'dotenv/config'
import pg from 'pg'

// Navigate, then wait until React has attached its handlers.
async function visit(page: Page, url: string) {
  await page.goto(url)
  await page.waitForSelector('html[data-hydrated]')
}

let counter = 0
const uniqueEmail = (label = 'user') =>
  `e2e+${label}${Date.now()}${counter++}@example.com`
const password = 'correct-horse-9'

// Sign-up is rate limited per IP, and every test signs up from the same one.
async function clearRateLimits() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  })
  try {
    await pool.query('delete from rate_limit')
  } finally {
    await pool.end()
  }
}

async function signUp(page: Page) {
  await clearRateLimits()
  const email = uniqueEmail()
  await visit(page, '/sign-up')
  await page.getByLabel('Your name').fill('Test Person')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { name: 'Write your first moment' }),
  ).toBeVisible()
}

test.describe.configure({ mode: 'serial' })

test('journal flow: write, tag, update, edit, tags, delete with undo', async ({
  page,
}) => {
  const problems: Array<string> = []
  page.on('console', (message) => {
    if (message.type() === 'error' || /hydrat/i.test(message.text())) {
      problems.push(message.text())
    }
  })
  page.on('pageerror', (error) => problems.push(error.message))

  // --- sign-up form validation, then real sign-up
  await visit(page, '/sign-up')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByText('Enter the name you want us to use.'),
  ).toBeVisible()
  await expect(
    page.getByText('Enter an email address like name@example.com.'),
  ).toBeVisible()
  await expect(
    page.getByText('Use at least 8 characters.').last(),
  ).toBeVisible()
  await signUp(page)

  // --- first run: validation messages are specific
  await page.getByRole('button', { name: 'Save moment' }).click()
  await expect(
    page.getByText('Add a title so you can find this later.'),
  ).toBeVisible()
  await expect(
    page.getByText('Write what happened, even a sentence.'),
  ).toBeVisible()
  await expect(page.getByLabel('Title')).toBeFocused()

  // --- write a moment with tags and scripture, save with the keyboard shortcut
  await page.getByLabel('Title').fill('The unexpected check')
  await page
    .getByLabel('What happened')
    .fill('Rent was due.\n\nA check arrived in the mail.')
  await page.getByRole('button', { name: 'Add tag Provision' }).click()
  await page.getByLabel('New tag name').fill('grace notes')
  await page.getByLabel('New tag name').press('Enter')
  await expect(
    page.getByRole('button', { name: 'Remove tag grace notes' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Add details' }).click()
  await page.getByLabel('Scripture').fill('Philippians 4:19')
  await page.getByLabel('Title').press('Control+Enter')

  await expect(
    page.getByRole('heading', { name: 'The unexpected check' }),
  ).toBeVisible()
  await expect(page.getByText('Provision', { exact: true })).toBeVisible()
  await expect(page.getByText('grace notes')).toBeVisible()
  await expect(page.getByText('Philippians 4:19')).toBeVisible()
  await expect(page.locator('.prose-entry p')).toHaveCount(2)

  // --- add "how it turned out" later
  await expect(page.getByText('Not written yet.')).toBeVisible()
  await page.getByRole('button', { name: 'Add an update' }).click()
  await page
    .getByLabel('How it turned out')
    .fill('Covered the rent with $40 to spare.')
  await page.getByRole('button', { name: 'Save update' }).click()
  await expect(
    page.getByText('Covered the rent with $40 to spare.'),
  ).toBeVisible()

  // --- edit title and date
  await page.getByRole('link', { name: 'Edit moment' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('The unexpected check')
  await page.getByLabel('Date').fill('2026-03-04')
  await page.getByLabel('Title').fill('The unexpected check (edited)')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(
    page.getByRole('heading', { name: 'The unexpected check (edited)' }),
  ).toBeVisible()
  await expect(page.getByText('March 4, 2026')).toBeVisible()

  // --- future dates are refused
  await visit(page, '/moments/new')
  await page.getByLabel('Title').fill('From the future')
  await page.getByLabel('What happened').fill('x')
  await page.getByLabel('Date').fill('2099-01-01')
  await page.getByRole('button', { name: 'Save moment' }).click()
  await expect(
    page.getByText("Moments can't be dated in the future."),
  ).toBeVisible()

  // --- draft autosave survives a reload; "Start over" clears it
  await visit(page, '/moments/new')
  await page.getByLabel('Title').fill('Half-written thought')
  await page.waitForTimeout(800)
  await page.reload()
  await page.waitForSelector('html[data-hydrated]')
  await expect(page.getByText('We restored your unsaved draft.')).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('Half-written thought')
  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('')

  // --- tags screen: rename, conflict, delete
  await visit(page, '/tags')
  await expect(page.getByText('grace notes')).toBeVisible()
  const row = (name: string) =>
    page.getByRole('listitem').filter({ hasText: name }).last()
  await row('grace notes').getByRole('button', { name: 'Rename' }).click()
  const nameBox = page.getByLabel(/New name for/)
  await nameBox.fill('PROVISION')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(
    page.getByText('You already have a tag called "PROVISION".'),
  ).toBeVisible()
  await nameBox.fill('Mercy')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByText('Mercy', { exact: true })).toBeVisible()
  await row('Mercy').getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete tag' }).click()
  await expect(page.getByText(/Deleted tag/)).toBeVisible()

  // --- delete a moment: confirm dialog, undo brings it back
  await visit(page, '/moments')
  await page
    .getByRole('link', { name: 'The unexpected check (edited)' })
    .click()
  await page
    .locator('#main')
    .getByRole('button', { name: 'Delete moment' })
    .click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Keep moment' }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(
    page.getByRole('heading', { name: 'The unexpected check (edited)' }),
  ).toBeVisible()

  await page
    .locator('#main')
    .getByRole('button', { name: 'Delete moment' })
    .click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete moment' })
    .click()
  await expect(page).toHaveURL(/\/moments$/)
  await expect(page.getByText('Moment deleted')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'The unexpected check (edited)' }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(
    page.getByRole('link', { name: 'The unexpected check (edited)' }),
  ).toBeVisible()
  await page.reload()
  await page.waitForSelector('html[data-hydrated]')
  await expect(
    page.getByRole('link', { name: 'The unexpected check (edited)' }),
  ).toBeVisible()

  // --- delete for real: wait out the undo window
  await page
    .getByRole('link', { name: 'The unexpected check (edited)' })
    .click()
  await page
    .locator('#main')
    .getByRole('button', { name: 'Delete moment' })
    .click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete moment' })
    .click()
  await expect(page.getByText('Moment deleted')).toBeHidden({ timeout: 15_000 })
  await page.reload()
  await page.waitForSelector('html[data-hydrated]')
  await expect(
    page.getByText(/You haven.t written a moment yet\./),
  ).toBeVisible()

  expect(problems, problems.join('\n')).toEqual([])
})

test("another account cannot open someone else's moment", async ({
  page,
  browser,
}) => {
  // account 1 writes a moment
  await signUp(page)
  await page.getByLabel('Title').fill('Private thing')
  await page.getByLabel('What happened').fill('Only for me.')
  await page.getByRole('button', { name: 'Save moment' }).click()
  await expect(
    page.getByRole('heading', { name: 'Private thing' }),
  ).toBeVisible()
  const url = page.url()

  // account 2 follows the same URL
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await visit(otherPage, '/sign-up')
  await otherPage.getByLabel('Your name').fill('Other Person')
  await otherPage
    .getByLabel('Email', { exact: true })
    .fill(uniqueEmail('other'))
  await otherPage.getByLabel('Password', { exact: true }).fill(password)
  await otherPage.getByRole('button', { name: 'Create account' }).click()
  await expect(
    otherPage.getByRole('heading', { name: 'Write your first moment' }),
  ).toBeVisible()
  await visit(otherPage, url)
  await expect(otherPage.getByText(/We couldn.t find that page/)).toBeVisible()
  await expect(otherPage.getByText('Private thing')).toHaveCount(0)
  await other.close()
})

test('moments list: search, tag and year filters, paging', async ({ page }) => {
  const problems: Array<string> = []
  page.on('console', (message) => {
    if (message.type() === 'error' || /hydrat/i.test(message.text())) {
      problems.push(message.text())
    }
  })
  page.on('pageerror', (error) => problems.push(error.message))

  await signUp(page)

  // Seed 23 moments directly: 21 in 2025, 1 in 2024 (tagged), 1 in 2025 (tagged).
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  })
  try {
    const { rows } = await pool.query(
      `select id from "user" where email like 'e2e+%' order by created_at desc limit 1`,
    )
    const userId = rows[0].id as string
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(`select set_config('app.user_id', $1, true)`, [userId])
      for (let i = 1; i <= 21; i++) {
        const day = String(i).padStart(2, '0')
        await client.query(
          `insert into entries (user_id, entry_date, title, body)
           values ($1, $2, $3, 'An ordinary day.')`,
          [userId, `2025-03-${day}`, `Filler ${i}`],
        )
      }
      const tag = await client.query(
        `insert into tags (user_id, name, name_key) values ($1, 'Healing', 'healing') returning id`,
        [userId],
      )
      for (const [date, title, body] of [
        ['2024-06-01', 'The surgery', 'The doctors found nothing wrong.'],
        ['2025-06-01', 'The fever broke', 'By morning she was well.'],
      ]) {
        const entry = await client.query(
          `insert into entries (user_id, entry_date, title, body)
           values ($1, $2, $3, $4) returning id`,
          [userId, date, title, body],
        )
        await client.query(
          `insert into entry_tags (entry_id, tag_id) values ($1, $2)`,
          [entry.rows[0].id, tag.rows[0].id],
        )
      }
      await client.query('commit')
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }

  // --- paging: 23 moments, 20 per page
  await visit(page, '/moments')
  await expect(page.getByText('23 moments, page 1 of 2')).toBeVisible()
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Filler' }),
  ).toHaveCount(19)
  await page.getByRole('button', { name: 'Older' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('Page 2 of 2').first()).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Filler 1', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Older' })).toBeDisabled()

  // --- search resets to page 1 and uses stemming
  await page.getByLabel('Search', { exact: true }).fill('doctor')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page).not.toHaveURL(/page=/)
  await expect(page.getByText('1 of 23 moments')).toBeVisible()
  await expect(page.getByRole('link', { name: 'The surgery' })).toBeVisible()

  // --- no match
  await page.getByLabel('Search', { exact: true }).fill('zebra')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText('No moments match these filters.')).toBeVisible()

  // --- tag and year filters combine
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByLabel('Filter by tag').selectOption('Healing')
  await expect(page.getByText('2 of 23 moments')).toBeVisible()
  await page.getByLabel('Filter by year').selectOption('2025')
  await expect(page.getByText('1 of 23 moments')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'The fever broke' }),
  ).toBeVisible()

  expect(problems).toEqual([])
})

test('insights and home: heat map, monthly counts, tags, on this day', async ({
  page,
}) => {
  const problems: Array<string> = []
  page.on('console', (message) => {
    if (message.type() === 'error' || /hydrat/i.test(message.text())) {
      problems.push(message.text())
    }
  })
  page.on('pageerror', (error) => problems.push(error.message))

  await signUp(page)

  // Empty state on Insights before any data is seeded would need a second
  // account; first-run Home is already covered by signUp().
  await visit(page, '/insights')
  await expect(
    page.getByText('Your heat map and the themes you notice most'),
  ).toBeVisible()

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  })
  const today = new Date()
  const iso = (daysAgo: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    return d.toISOString().slice(0, 10)
  }
  try {
    const { rows } = await pool.query(
      `select id from "user" where email like 'e2e+%' order by created_at desc limit 1`,
    )
    const userId = rows[0].id as string
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(`select set_config('app.user_id', $1, true)`, [userId])
      const tag = await client.query(
        `insert into tags (user_id, name, name_key) values ($1, 'Provision', 'provision') returning id`,
        [userId],
      )
      // 2 moments today, 1 yesterday, 1 a week ago, 1 forty days ago, 1 on this
      // day last year.
      const seeds: Array<[string, string]> = [
        [iso(0), 'Today A'],
        [iso(0), 'Today B'],
        [iso(1), 'Yesterday'],
        [iso(7), 'Last week'],
        [iso(40), 'Forty days ago'],
        [iso(365), 'A year ago'],
      ]
      for (const [date, title] of seeds) {
        const entry = await client.query(
          `insert into entries (user_id, entry_date, title, body)
           values ($1, $2, $3, 'Something good.') returning id`,
          [userId, date, title],
        )
        if (title !== 'A year ago') {
          await client.query(
            `insert into entry_tags (entry_id, tag_id) values ($1, $2)`,
            [entry.rows[0].id, tag.rows[0].id],
          )
        }
      }
      await client.query('commit')
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }

  // --- Insights
  await visit(page, '/insights')
  await expect(
    page.getByRole('heading', { name: 'The past year' }),
  ).toBeVisible()
  await expect(page.getByText('6 moments in the last 53 weeks')).toBeVisible()
  const heat = page.getByRole('img', {
    name: /Heat map of moments per day over the past year/,
  })
  await expect(heat).toBeVisible()
  // One painted cell per day from the grid start through today.
  expect(await heat.locator('rect').count()).toBeGreaterThan(300)
  await page.screenshot({ path: 'test-results/insights.png', fullPage: true })

  await page.getByText('Show as a table').nth(1).click()
  await expect(
    page.getByRole('row', { name: /Provision/ }).first(),
  ).toBeVisible()

  // --- Home
  await visit(page, '/')
  await expect(page.getByRole('img', { name: /last 14 weeks/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'On this day' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'A year ago' })).toBeVisible()
  await page.screenshot({ path: 'test-results/home.png', fullPage: true })

  expect(problems).toEqual([])
})
