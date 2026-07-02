import { createClient as createSupabaseClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);

const newDetails = [
  // 1. Z and E details
  {
    campaign_id: 17,
    booking_class: ['E', 'Z'],
    discount_base: 'FARE',
    discount_percentage: 0,
    amount: 800000,
    groups_tag: ['Việt Nam <-> Quốc tế'],
  },
  {
    campaign_id: 17,
    booking_class: ['E', 'Z'],
    discount_base: 'FARE',
    discount_percentage: 0,
    amount: 50000,
    groups_tag: ['Việt Nam <-> Việt Nam'],
  },
  {
    campaign_id: 17,
    booking_class: ['E', 'Z'],
    discount_base: 'FARE',
    discount_percentage: 0,
    amount: 50000,
    groups_tag: ['PQC <-> Việt Nam'],
  },
  // 2. PQC entries for other classes
  {
    campaign_id: 17,
    booking_class: ['J'],
    discount_base: 'FARE',
    discount_percentage: 0,
    amount: 250000,
    groups_tag: ['PQC <-> Việt Nam'],
  },
  {
    campaign_id: 17,
    booking_class: ['C', 'I'],
    discount_base: 'FARE',
    discount_percentage: 0,
    amount: 200000,
    groups_tag: ['PQC <-> Việt Nam'],
  },
  {
    campaign_id: 17,
    booking_class: ['B', 'W', 'Y'],
    discount_base: 'FARE',
    discount_percentage: 0,
    amount: 50000,
    groups_tag: ['PQC <-> Việt Nam'],
  },
  {
    campaign_id: 17,
    booking_class: ['H', 'K', 'L', 'M'],
    discount_base: 'FARE',
    discount_percentage: 0,
    amount: 30000,
    groups_tag: ['PQC <-> Việt Nam'],
  },
  {
    campaign_id: 17,
    booking_class: ['N', 'O', 'Q', 'R', 'T'],
    discount_base: 'FARE',
    discount_percentage: 0,
    amount: 15000,
    groups_tag: ['PQC <-> Việt Nam'],
  },
  {
    campaign_id: 17,
    booking_class: ['U', 'V'],
    discount_base: 'FARE',
    discount_percentage: 0,
    amount: 10000,
    groups_tag: ['PQC <-> Việt Nam'],
  },
];

async function run() {
  const { data, error } = await supabase
    .from('campaign_details')
    .insert(newDetails)
    .select();
  if (error) {
    console.error('Error inserting details:', error);
  } else {
    console.log('Successfully inserted details:', data);
  }
}
run();
