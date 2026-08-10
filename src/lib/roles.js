export const ROLES = ['staff', 'intern', 'volunteer', 'spv', 'manager', 'direktur', 'hr']

// Intern & volunteer hanya berhak absen. Pembatasan sesungguhnya ditegakkan
// di RLS Supabase (lihat supabase/migrations/0001_init.sql) - konstanta ini
// hanya dipakai untuk menyembunyikan menu di UI.
export const ROLES_TANPA_PENGAJUAN = ['intern', 'volunteer']

export const ROLES_APPROVER = ['spv', 'manager', 'direktur']

export function bisaMengajukan(role) {
  return !ROLES_TANPA_PENGAJUAN.includes(role)
}

export function bisaApprove(role) {
  return ROLES_APPROVER.includes(role)
}

export const STATUS_LABEL = {
  pending_approval1: 'Menunggu Approval 1',
  pending_approval2: 'Menunggu Approval 2',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}
