-- Runs once when the Postgres container is first created.
-- A separate database so automated tests never touch dev data.
CREATE DATABASE inquiry_test OWNER inquiry;
