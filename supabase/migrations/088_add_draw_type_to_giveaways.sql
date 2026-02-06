-- 추첨 방식 필드 추가
alter table public.giveaways
add column if not exists draw_type text not null default 'random' check (draw_type in ('random', 'manual'));

comment on column public.giveaways.draw_type is '추첨 방식: random(랜덤 추첨), manual(사용자 지정)';

-- 사용자 지정 방식일 때 사용할 수 있는 필드 추가 (선택된 당첨자 ID 목록)
alter table public.giveaways
add column if not exists manual_winners jsonb;

comment on column public.giveaways.manual_winners is '사용자 지정 방식일 때 선택된 당첨자 participant_id 배열';

-- 추첨 설명 필드 추가
alter table public.giveaways
add column if not exists description text;

comment on column public.giveaways.description is '추첨 설명문구';
