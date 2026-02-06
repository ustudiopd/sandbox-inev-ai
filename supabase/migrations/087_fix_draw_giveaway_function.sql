-- 추첨 함수 수정: RETURNING ... INTO 제거하여 여러 행 반환 문제 해결
create or replace function public.draw_giveaway(p_giveaway_id uuid, p_seed text)
returns jsonb language plpgsql as $$
declare
  n int;
begin
  select winners_count into n from public.giveaways where id = p_giveaway_id FOR UPDATE;
  if n is null then raise exception 'giveaway not found'; end if;

  -- 기존 당첨자 삭제 (재추첨 방지)
  delete from public.giveaway_winners where giveaway_id = p_giveaway_id;

  with c as (
    select e.*, encode(digest(e.id::text || p_seed, 'sha256'), 'hex') as hash_hex
    from public.giveaway_entries e
    where e.giveaway_id = p_giveaway_id and e.eligible = true
  ), ranked as (
    select *, row_number() over (order by hash_hex asc) as rn
    from c
  ), picked as (
    select * from ranked where rn <= n
  )
  insert into public.giveaway_winners(giveaway_id, participant_id, rank, proof_json)
    select p_giveaway_id, participant_id, rn,
           jsonb_build_object('seed', p_seed, 'hash', hash_hex, 'algo', 'sha256(entry_id||seed)')
    from picked;

  -- 모든 당첨자를 JSON 배열로 반환
  return (select jsonb_agg(jsonb_build_object('participant_id', participant_id, 'rank', rank, 'proof', proof_json))
          from public.giveaway_winners where giveaway_id=p_giveaway_id);
end;
$$;
