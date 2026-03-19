export interface Company {
  id: string
  name: string
  domain: string | null
  plan: string | null
  max_employees: number | null
  created_at: string
}

export interface DigitalEmployee {
  id: string
  company_id: string | null
  name: string
  title: string
  department: string | null
  manager_name: string | null
  manager_email: string | null
  employee_id: string | null
  category: string | null
  status: string
  created_at: string
}

export interface Ticket {
  id: string
  company_id: string | null
  employee_id: string | null
  ticket_ref: string | null
  submitter_name: string | null
  submitter_email: string | null
  category: string | null
  question: string
  response: string | null
  status: string
  escalated: boolean
  created_at: string
  resolved_at: string | null
}
