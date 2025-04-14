export const config = {
  runtime: 'edge',
  unstable_allowDynamic: [
    // Required for @supabase/ssr
    '**/node_modules/@supabase/ssr/**',
  ],
}
