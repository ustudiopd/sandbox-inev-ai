begin;

-- fill_org_fields() 함수 수정: form_id를 통한 간접 조회 지원
-- form_submissions, form_answers, quiz_attempts는 webinar_id가 없고 form_id만 있음
create or replace function public.fill_org_fields() returns trigger as $$
declare 
  agency_id_val uuid;
  client_id_val uuid;
begin
  -- webinar_id가 직접 있는 경우
  if (TG_TABLE_NAME = 'forms' or TG_TABLE_NAME = 'webinar_files' or TG_TABLE_NAME = 'giveaways') then
    if new.webinar_id is not null then
      select agency_id, client_id into strict agency_id_val, client_id_val
      from public.webinars 
      where id = new.webinar_id;
      
      if new.agency_id is null then 
        new.agency_id := agency_id_val; 
      end if;
      
      if new.client_id is null then 
        new.client_id := client_id_val; 
      end if;
    end if;
  -- form_id를 통해 간접 조회가 필요한 경우
  elsif (TG_TABLE_NAME = 'form_submissions' or TG_TABLE_NAME = 'form_answers' or TG_TABLE_NAME = 'quiz_attempts') then
    if new.form_id is not null then
      -- forms 테이블에서 webinar_id를 통해 agency_id, client_id 조회
      select w.agency_id, w.client_id into strict agency_id_val, client_id_val
      from public.forms f
      join public.webinars w on w.id = f.webinar_id
      where f.id = new.form_id;
      
      if agency_id_val is not null and new.agency_id is null then 
        new.agency_id := agency_id_val; 
      end if;
      
      if client_id_val is not null and new.client_id is null then 
        new.client_id := client_id_val; 
      end if;
    end if;
  -- 기타 테이블 (messages, questions 등)
  else
    if new.webinar_id is not null then
      select agency_id, client_id into strict agency_id_val, client_id_val
      from public.webinars 
      where id = new.webinar_id;
      
      if new.agency_id is null then 
        new.agency_id := agency_id_val; 
      end if;
      
      if new.client_id is null then 
        new.client_id := client_id_val; 
      end if;
    end if;
  end if;
  
  return new;
exception
  when no_data_found then
    -- 웨비나나 폼을 찾을 수 없는 경우 그대로 진행 (에러 방지)
    return new;
end; 
$$ language plpgsql;

commit;

