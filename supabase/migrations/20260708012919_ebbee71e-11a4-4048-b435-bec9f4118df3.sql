INSERT INTO app_config (key, value) VALUES
  ('paddle_price_personal_monthly',         'pri_01kwax1ay6r4gnjk82xfx1c1r1'),
  ('paddle_price_personal_annual',          'pri_01kwax2jyyc1jm60jge12j4yr8'),
  ('paddle_price_personal_student_monthly', 'pri_01kwaxkaecntk2e2bw47qjnwxm'),
  ('paddle_price_personal_student_annual',  'pri_01kwaxmvn0k927c2mj1xdrax33'),
  ('paddle_price_family_monthly',           'pri_01kwax44af5xps13dvamd506sz'),
  ('paddle_price_family_annual',            'pri_01kwax5fpxjv0rkjad9rkbr885'),
  ('paddle_price_community_monthly',        'pri_01kwax6p8q20mdq62392g14640'),
  ('paddle_price_community_annual',         'pri_01kwax81bps2t55x3wvbz024vr')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;