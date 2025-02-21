import { describe, expect, it, vi } from 'vitest'
import * as main from '../src/main.js'

const runMock = vi.spyOn(main, 'run').mockImplementation()

describe('index', () => {
  it('calls run when imported', async () => {
    await import('../src/index.js')

    expect(runMock).toHaveBeenCalled()
  })
})
