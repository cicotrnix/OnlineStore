/** Forma serializable de OrganizationAddress para pasar a componentes client. */
export type AddressView = {
  id: string
  label: string
  recipient: string
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
  phone: string | null
  isDefaultBilling: boolean
  isDefaultShipping: boolean
}
