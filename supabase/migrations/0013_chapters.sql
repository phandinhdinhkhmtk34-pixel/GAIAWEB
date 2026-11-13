-- Content is organised in five chapters (第1章〜第5章). Replaces the old categories;
-- videos in old categories move to 第1章 (reassign them in Admin > 動画). Safe to run again.
insert into categories (slug, sort_order) values
  ('ch1', 1), ('ch2', 2), ('ch3', 3), ('ch4', 4), ('ch5', 5)
on conflict (slug) do update set sort_order = excluded.sort_order;

insert into translations (entity_type, entity_id, locale, title)
select 'category', c.id, t.locale, t.title
from categories c
join (values
  ('ch1', 'ja', '社会人としての基本姿勢'), ('ch1', 'vi', 'Thái độ cơ bản của người đi làm'), ('ch1', 'en', 'The professional mindset'),
  ('ch2', 'ja', '自己成長と人間力'), ('ch2', 'vi', 'Phát triển bản thân và nhân cách'), ('ch2', 'en', 'Self-growth and character'),
  ('ch3', 'ja', '人間関係と心の成長'), ('ch3', 'vi', 'Quan hệ con người và trưởng thành nội tâm'), ('ch3', 'en', 'Relationships and inner growth'),
  ('ch4', 'ja', '信頼されるリーダーと組織づくり'), ('ch4', 'vi', 'Lãnh đạo đáng tin cậy và xây dựng tổ chức'), ('ch4', 'en', 'Trusted leadership and building teams'),
  ('ch5', 'ja', '人生と人を生かす経営'), ('ch5', 'vi', 'Cuộc đời và quản trị phát huy con người'), ('ch5', 'en', 'Life, and management that brings out people''s best')
) as t(slug, locale, title) on t.slug = c.slug
on conflict (entity_type, entity_id, locale) do update set title = excluded.title;

update videos set category_id = (select id from categories where slug = 'ch1')
where category_id in (select id from categories where slug not in ('ch1', 'ch2', 'ch3', 'ch4', 'ch5'));

delete from translations
where entity_type = 'category'
  and entity_id in (select id from categories where slug not in ('ch1', 'ch2', 'ch3', 'ch4', 'ch5'));
delete from categories where slug not in ('ch1', 'ch2', 'ch3', 'ch4', 'ch5');
