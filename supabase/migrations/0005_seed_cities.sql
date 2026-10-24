-- SomaliStay migration 0005: verified destination reference data
-- Geographic facts only — no hotels, prices, or bookings are seeded.

insert into public.cities (name, name_so, region, slug) values
  ('Mogadishu', 'Muqdisho', 'Banadir', 'mogadishu'),
  ('Hargeisa', 'Hargeysa', 'Maroodi Jeex', 'hargeisa'),
  ('Bosaso', 'Boosaaso', 'Bari', 'bosaso'),
  ('Kismayo', 'Kismaayo', 'Lower Juba', 'kismayo'),
  ('Berbera', 'Berbera', 'Sahil', 'berbera'),
  ('Garowe', 'Garoowe', 'Nugal', 'garowe'),
  ('Burao', 'Burco', 'Togdheer', 'burao'),
  ('Galkayo', 'Gaalkacyo', 'Mudug', 'galkayo'),
  ('Baidoa', 'Baydhabo', 'Bay', 'baidoa'),
  ('Merca', 'Marka', 'Lower Shabelle', 'merca'),
  ('Las Anod', 'Laascaanood', 'Sool', 'las-anod'),
  ('Erigavo', 'Ceerigaabo', 'Sanaag', 'erigavo'),
  ('Zeila', 'Saylac', 'Awdal', 'zeila'),
  ('Beledweyne', 'Beledweyne', 'Hiran', 'beledweyne')
on conflict (slug) do nothing;
