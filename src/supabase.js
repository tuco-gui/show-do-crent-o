// Carrega o client do Supabase sem bundler/Import Meta.
// Deixa disponível em window.SB.

(function () {
    const SUPABASE_URL = "https://ihajmegcdgwchxslnaep.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYWptZWdjZGd3Y2h4c2xuYWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTQzMTgsImV4cCI6MjA3MjA3MDMxOH0.WM36lA9n0PU9qd-DKdrWVB_UzGVXpsfJ984oHiXDU8Y";
  
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
    window.SB = {
      client,
      url: SUPABASE_URL,
      anon: SUPABASE_ANON_KEY,
    };
  })();
  