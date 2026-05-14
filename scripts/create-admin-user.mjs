/**
 * Cria o usuário administrador no Supabase Auth.
 * Execute uma única vez: node scripts/create-admin-user.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cppkzjzkzopdjxqzdhso.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcGt6anprem9wZGp4cXpkaHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mjg1MDAsImV4cCI6MjA5NDEwNDUwMH0.oV-5TVOHJE3-2Gpb7UY8zrkoDt_hvS4isWaSm8mML9k'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const { data, error } = await supabase.auth.signUp({
  email: 'lucasmarteux@gmail.com',
  password: '123456',
})

if (error) {
  console.error('Erro ao criar usuário:', error.message)
  process.exit(1)
}

console.log('Usuário criado com sucesso:', data.user?.email)
console.log('Confirme o e-mail no Dashboard do Supabase se necessário (Authentication > Users).')
