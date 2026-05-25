import { describe, expect, it } from 'vitest'
import { createOrganizationSchema, inviteMemberSchema, orgRoleSchema } from './schemas'

describe('createOrganizationSchema', () => {
  it('accepts valid input', () => {
    const result = createOrganizationSchema.parse({ name: 'Acme Co', slug: 'acme-co' })
    expect(result.slug).toBe('acme-co')
  })

  it('rejects slug with uppercase', () => {
    expect(() => createOrganizationSchema.parse({ name: 'Acme', slug: 'Acme-Co' })).toThrow()
  })

  it('rejects empty name', () => {
    expect(() => createOrganizationSchema.parse({ name: '', slug: 'acme' })).toThrow()
  })
})

describe('inviteMemberSchema', () => {
  it('defaults role to BUYER', () => {
    const result = inviteMemberSchema.parse({ email: 'a@b.com' })
    expect(result.role).toBe('BUYER')
  })

  it('rejects invalid email', () => {
    expect(() => inviteMemberSchema.parse({ email: 'not-an-email' })).toThrow()
  })
})

describe('orgRoleSchema', () => {
  it('accepts all valid roles', () => {
    for (const role of ['OWNER', 'ADMIN', 'BUYER', 'VIEWER']) {
      expect(orgRoleSchema.parse(role)).toBe(role)
    }
  })
})
