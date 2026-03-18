DO $$
DECLARE
    t_name text;
    trig_name text;
BEGIN
    FOR t_name, trig_name IN 
        SELECT event_object_table, trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'public' 
        AND event_object_table = 'applications'
    LOOP
        RAISE NOTICE 'Trigger found: % on table %', trig_name, t_name;
    END LOOP;
END $$;
