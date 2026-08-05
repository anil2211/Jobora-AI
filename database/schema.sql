create table users (

id uuid default uuid_generate_v4()
primary key,

google_id text unique,

email text,

name text,

avatar text,

created_at timestamp default now()

);


alter table jobs

add column user_id uuid
references users(id);