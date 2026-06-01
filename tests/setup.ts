import '@testing-library/jest-dom/vitest'

// Tests need to truncate append-only tables via cleanDb.
process.env.APPEND_ONLY_GUARD = 'off'
