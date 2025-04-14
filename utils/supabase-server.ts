import { createServerComponentClient as createServerComponentClientBase } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export const createServerComponentClient = async () => {
  return createServerComponentClientBase<Database>({
    cookies
  })
}
