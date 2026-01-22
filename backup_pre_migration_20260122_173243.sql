--
-- PostgreSQL database dump
--

\restrict 3yF80Q7GAOAhMdd87HuPdDxgL50BAe4XxeOkctoxvmRzEIkTra6DcDhWbofVaJe

-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 14.20 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: ruolo_utente; Type: TYPE; Schema: public; Owner: team_user
--

CREATE TYPE public.ruolo_utente AS ENUM (
    'risorsa',
    'manager'
);


ALTER TYPE public.ruolo_utente OWNER TO team_user;

--
-- Name: stato_approvazione; Type: TYPE; Schema: public; Owner: team_user
--

CREATE TYPE public.stato_approvazione AS ENUM (
    'pending_approval',
    'approvata',
    'rifiutata'
);


ALTER TYPE public.stato_approvazione OWNER TO team_user;

--
-- Name: stato_attivita; Type: TYPE; Schema: public; Owner: team_user
--

CREATE TYPE public.stato_attivita AS ENUM (
    'pianificata',
    'in_esecuzione',
    'completata',
    'programmata'
);


ALTER TYPE public.stato_attivita OWNER TO team_user;

--
-- Name: stato_riassegnazione; Type: TYPE; Schema: public; Owner: team_user
--

CREATE TYPE public.stato_riassegnazione AS ENUM (
    'attiva',
    'annullata'
);


ALTER TYPE public.stato_riassegnazione OWNER TO team_user;

--
-- Name: stato_task; Type: TYPE; Schema: public; Owner: team_user
--

CREATE TYPE public.stato_task AS ENUM (
    'programmata',
    'in_esecuzione',
    'completata'
);


ALTER TYPE public.stato_task OWNER TO team_user;

--
-- Name: update_activity_actual_hours(); Type: FUNCTION; Schema: public; Owner: team_user
--

CREATE FUNCTION public.update_activity_actual_hours() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE NOTICE 'Ricalcolo ore effettive per attività: %', COALESCE(NEW.attivita_id, OLD.attivita_id);
    
    UPDATE attivita 
    SET ore_effettive = (
        SELECT COALESCE(SUM(ore_effettive), 0) 
        FROM task 
        WHERE attivita_id = COALESCE(NEW.attivita_id, OLD.attivita_id) 
        AND stato = 'completata'
        AND ore_effettive IS NOT NULL
    ),
    data_aggiornamento = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.attivita_id, OLD.attivita_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.update_activity_actual_hours() OWNER TO team_user;

--
-- Name: update_activity_estimated_hours(); Type: FUNCTION; Schema: public; Owner: team_user
--

CREATE FUNCTION public.update_activity_estimated_hours() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE NOTICE 'Ricalcolo ore stimate per attività: %', COALESCE(NEW.attivita_id, OLD.attivita_id);
    
    -- Calcola ore_stimate sommando tutte le task
    UPDATE attivita 
    SET ore_stimate = (
        SELECT COALESCE(SUM(ore_stimate), 0) 
        FROM task 
        WHERE attivita_id = COALESCE(NEW.attivita_id, OLD.attivita_id)
    ),
    data_aggiornamento = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.attivita_id, OLD.attivita_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.update_activity_estimated_hours() OWNER TO team_user;

--
-- Name: valida_riassegnazione(uuid, integer); Type: FUNCTION; Schema: public; Owner: team_user
--

CREATE FUNCTION public.valida_riassegnazione(p_task_sorgente_id uuid, p_minuti_prelevati integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_credito_disponibile INTEGER;
BEGIN
    -- Ottieni credito disponibile per la task sorgente
    SELECT credito_disponibile_minuti INTO v_credito_disponibile
    FROM crediti_task_disponibili 
    WHERE task_id = p_task_sorgente_id;
    
    -- Se non trova la task, nessun credito disponibile
    IF v_credito_disponibile IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se ci sono abbastanza minuti disponibili
    RETURN v_credito_disponibile >= p_minuti_prelevati;
END;
$$;


ALTER FUNCTION public.valida_riassegnazione(p_task_sorgente_id uuid, p_minuti_prelevati integer) OWNER TO team_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assegnazioni_attivita; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.assegnazioni_attivita (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    attivita_id uuid NOT NULL,
    utente_id uuid NOT NULL,
    data_assegnazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attivo boolean DEFAULT true
);


ALTER TABLE public.assegnazioni_attivita OWNER TO team_user;

--
-- Name: assegnazioni_progetto; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.assegnazioni_progetto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    progetto_id uuid NOT NULL,
    utente_id uuid NOT NULL,
    ore_assegnate integer NOT NULL,
    data_assegnazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attivo boolean DEFAULT true
);


ALTER TABLE public.assegnazioni_progetto OWNER TO team_user;

--
-- Name: attivita; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.attivita (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome character varying(255) NOT NULL,
    descrizione text,
    progetto_id uuid NOT NULL,
    ore_stimate integer,
    ore_effettive integer DEFAULT 0,
    stato public.stato_attivita DEFAULT 'pianificata'::public.stato_attivita,
    scadenza timestamp without time zone,
    data_creazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    creata_da uuid NOT NULL,
    attivo boolean DEFAULT true
);


ALTER TABLE public.attivita OWNER TO team_user;

--
-- Name: clienti; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.clienti (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome character varying(255) NOT NULL,
    descrizione text,
    budget numeric(12,2),
    budget_utilizzato numeric(12,2) DEFAULT 0,
    stato_approvazione public.stato_approvazione DEFAULT 'pending_approval'::public.stato_approvazione,
    approvato_da uuid,
    data_approvazione timestamp without time zone,
    creato_da uuid NOT NULL,
    data_creazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attivo boolean DEFAULT true
);


ALTER TABLE public.clienti OWNER TO team_user;

--
-- Name: progetti; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.progetti (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome character varying(255) NOT NULL,
    descrizione text,
    cliente_id uuid NOT NULL,
    budget_assegnato numeric(12,2),
    budget_utilizzato numeric(12,2) DEFAULT 0,
    stato_approvazione public.stato_approvazione DEFAULT 'pending_approval'::public.stato_approvazione,
    approvato_da uuid,
    data_approvazione timestamp without time zone,
    data_inizio date,
    data_fine date,
    scadenza timestamp without time zone,
    creato_da uuid NOT NULL,
    data_creazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attivo boolean DEFAULT true
);


ALTER TABLE public.progetti OWNER TO team_user;

--
-- Name: riassegnazioni_ore; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.riassegnazioni_ore (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    task_sorgente_id uuid NOT NULL,
    minuti_prelevati integer NOT NULL,
    task_destinazione_id uuid,
    attivita_destinazione_id uuid,
    progetto_destinazione_id uuid NOT NULL,
    minuti_assegnati integer NOT NULL,
    creato_da uuid NOT NULL,
    motivo text,
    data_riassegnazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    stato public.stato_riassegnazione DEFAULT 'attiva'::public.stato_riassegnazione,
    data_annullamento timestamp without time zone,
    annullato_da uuid,
    motivo_annullamento text,
    CONSTRAINT minuti_positivi CHECK (((minuti_prelevati > 0) AND (minuti_assegnati > 0))),
    CONSTRAINT sorgente_destinazione_diverse CHECK ((task_sorgente_id <> task_destinazione_id))
);


ALTER TABLE public.riassegnazioni_ore OWNER TO team_user;

--
-- Name: task; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.task (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome character varying(255) NOT NULL,
    descrizione text,
    attivita_id uuid NOT NULL,
    utente_assegnato uuid NOT NULL,
    ore_stimate integer,
    ore_effettive integer,
    stato public.stato_task DEFAULT 'programmata'::public.stato_task,
    scadenza timestamp without time zone,
    task_collegata_id uuid,
    task_madre_id uuid,
    data_creazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_completamento timestamp without time zone,
    data_aggiornamento timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    creata_da uuid NOT NULL,
    task_collegata_config jsonb,
    priorita character varying(20) DEFAULT 'medium'::character varying,
    attivo boolean DEFAULT true
);


ALTER TABLE public.task OWNER TO team_user;

--
-- Name: utenti; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.utenti (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    ruolo public.ruolo_utente NOT NULL,
    compenso_annuale numeric(10,2) NOT NULL,
    costo_orario numeric(10,2),
    attivo boolean DEFAULT true,
    data_creazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ore_disponibili_anno integer DEFAULT 1760,
    costo_orario_manuale boolean DEFAULT false,
    ore_disponibili_manuale boolean DEFAULT false
);


ALTER TABLE public.utenti OWNER TO team_user;

--
-- Name: crediti_task_disponibili; Type: VIEW; Schema: public; Owner: team_user
--

CREATE VIEW public.crediti_task_disponibili AS
 WITH task_crediti AS (
         SELECT t.id AS task_id,
            t.nome AS task_nome,
            t.ore_stimate,
            t.ore_effettive,
            t.utente_assegnato,
            u.nome AS risorsa_nome,
            p.id AS progetto_id,
            p.nome AS progetto_nome,
            c.id AS cliente_id,
            c.nome AS cliente_nome,
            a.nome AS attivita_nome,
                CASE
                    WHEN (t.ore_stimate > t.ore_effettive) THEN (t.ore_stimate - t.ore_effettive)
                    ELSE 0
                END AS credito_originale_minuti
           FROM ((((public.task t
             JOIN public.attivita a ON ((t.attivita_id = a.id)))
             JOIN public.progetti p ON ((a.progetto_id = p.id)))
             JOIN public.clienti c ON ((p.cliente_id = c.id)))
             JOIN public.utenti u ON ((t.utente_assegnato = u.id)))
          WHERE ((t.stato = 'completata'::public.stato_task) AND (t.ore_effettive IS NOT NULL) AND (t.ore_stimate > t.ore_effettive))
        ), crediti_utilizzati AS (
         SELECT riassegnazioni_ore.task_sorgente_id,
            sum(riassegnazioni_ore.minuti_prelevati) AS minuti_utilizzati
           FROM public.riassegnazioni_ore
          WHERE (riassegnazioni_ore.stato = 'attiva'::public.stato_riassegnazione)
          GROUP BY riassegnazioni_ore.task_sorgente_id
        )
 SELECT tc.task_id,
    tc.task_nome,
    tc.ore_stimate,
    tc.ore_effettive,
    tc.utente_assegnato,
    tc.risorsa_nome,
    tc.progetto_id,
    tc.progetto_nome,
    tc.cliente_id,
    tc.cliente_nome,
    tc.attivita_nome,
    tc.credito_originale_minuti,
    COALESCE(cu.minuti_utilizzati, (0)::bigint) AS credito_utilizzato_minuti,
    (tc.credito_originale_minuti - COALESCE(cu.minuti_utilizzati, (0)::bigint)) AS credito_disponibile_minuti,
    round((((tc.credito_originale_minuti - COALESCE(cu.minuti_utilizzati, (0)::bigint)))::numeric / (60)::numeric), 2) AS credito_disponibile_ore
   FROM (task_crediti tc
     LEFT JOIN crediti_utilizzati cu ON ((tc.task_id = cu.task_sorgente_id)))
  WHERE ((tc.credito_originale_minuti - COALESCE(cu.minuti_utilizzati, (0)::bigint)) > 0)
  ORDER BY tc.cliente_nome, tc.progetto_nome, tc.task_nome;


ALTER TABLE public.crediti_task_disponibili OWNER TO team_user;

--
-- Name: debiti_task; Type: VIEW; Schema: public; Owner: team_user
--

CREATE VIEW public.debiti_task AS
 SELECT t.id AS task_id,
    t.nome AS task_nome,
    t.ore_stimate,
    t.ore_effettive,
    t.utente_assegnato,
    u.nome AS risorsa_nome,
    p.id AS progetto_id,
    p.nome AS progetto_nome,
    c.id AS cliente_id,
    c.nome AS cliente_nome,
    a.nome AS attivita_nome,
    (t.ore_effettive - t.ore_stimate) AS debito_minuti,
    round((((t.ore_effettive - t.ore_stimate))::numeric / (60)::numeric), 2) AS debito_ore,
    COALESCE(sum(r.minuti_assegnati), (0)::bigint) AS compensato_minuti,
    ((t.ore_effettive - t.ore_stimate) - COALESCE(sum(r.minuti_assegnati), (0)::bigint)) AS debito_residuo_minuti
   FROM (((((public.task t
     JOIN public.attivita a ON ((t.attivita_id = a.id)))
     JOIN public.progetti p ON ((a.progetto_id = p.id)))
     JOIN public.clienti c ON ((p.cliente_id = c.id)))
     JOIN public.utenti u ON ((t.utente_assegnato = u.id)))
     LEFT JOIN public.riassegnazioni_ore r ON (((t.id = r.task_destinazione_id) AND (r.stato = 'attiva'::public.stato_riassegnazione))))
  WHERE ((t.stato = 'completata'::public.stato_task) AND (t.ore_effettive IS NOT NULL) AND (t.ore_effettive > t.ore_stimate))
  GROUP BY t.id, t.nome, t.ore_stimate, t.ore_effettive, t.utente_assegnato, u.nome, p.id, p.nome, c.id, c.nome, a.nome
 HAVING (((t.ore_effettive - t.ore_stimate) - COALESCE(sum(r.minuti_assegnati), (0)::bigint)) > 0)
  ORDER BY c.nome, p.nome, t.nome;


ALTER TABLE public.debiti_task OWNER TO team_user;

--
-- Name: riassegnazioni_dettagliate; Type: VIEW; Schema: public; Owner: team_user
--

CREATE VIEW public.riassegnazioni_dettagliate AS
 SELECT r.id AS riassegnazione_id,
    r.minuti_prelevati,
    r.minuti_assegnati,
    r.motivo,
    r.data_riassegnazione,
    r.stato,
    ts.nome AS task_sorgente_nome,
    us.nome AS risorsa_sorgente_nome,
    ps.nome AS progetto_sorgente_nome,
    cs.nome AS cliente_sorgente_nome,
    td.nome AS task_destinazione_nome,
    ud.nome AS risorsa_destinazione_nome,
    pd.nome AS progetto_destinazione_nome,
    cd.nome AS cliente_destinazione_nome,
    um.nome AS manager_nome,
    r.data_annullamento,
    r.motivo_annullamento,
    ua.nome AS annullato_da_nome
   FROM ((((((((((((public.riassegnazioni_ore r
     JOIN public.task ts ON ((r.task_sorgente_id = ts.id)))
     JOIN public.attivita ass ON ((ts.attivita_id = ass.id)))
     JOIN public.progetti ps ON ((ass.progetto_id = ps.id)))
     JOIN public.clienti cs ON ((ps.cliente_id = cs.id)))
     JOIN public.utenti us ON ((ts.utente_assegnato = us.id)))
     JOIN public.utenti um ON ((r.creato_da = um.id)))
     LEFT JOIN public.task td ON ((r.task_destinazione_id = td.id)))
     LEFT JOIN public.attivita ad ON ((td.attivita_id = ad.id)))
     LEFT JOIN public.progetti pd ON ((ad.progetto_id = pd.id)))
     LEFT JOIN public.clienti cd ON ((pd.cliente_id = cd.id)))
     LEFT JOIN public.utenti ud ON ((td.utente_assegnato = ud.id)))
     LEFT JOIN public.utenti ua ON ((r.annullato_da = ua.id)))
  ORDER BY r.data_riassegnazione DESC;


ALTER TABLE public.riassegnazioni_dettagliate OWNER TO team_user;

--
-- Name: timesheet; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.timesheet (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    utente_id uuid NOT NULL,
    task_id uuid,
    data date NOT NULL,
    ore_lavorate integer NOT NULL,
    descrizione text,
    data_registrazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attivo boolean DEFAULT true
);


ALTER TABLE public.timesheet OWNER TO team_user;

--
-- Data for Name: assegnazioni_attivita; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.assegnazioni_attivita (id, attivita_id, utente_id, data_assegnazione, attivo) FROM stdin;
9dec6867-a889-41d5-9535-0928f8841890	9942c8ec-f3f9-453a-9d49-8842b5e02197	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:13:14.233488	t
a1a1e370-1c64-415e-aaa3-841ead76e37f	ce7b9d16-e0d4-4453-8325-5958e63f7561	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:13:14.233488	t
34d2f92a-8bed-48e4-b0ff-7450efc6365a	928f118a-4b00-4cfc-8fc3-036478095388	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:13:14.233488	t
0735043c-16f6-41a9-b3ad-4ffb984e7d03	617d710b-480e-4205-a477-a97a9ea599f3	3b80691f-07ee-47ed-ad93-729aace6b52f	2026-01-15 10:20:05.270985	t
e6ac5896-4125-407b-950c-7c5a802daba5	0ca492ed-e165-4545-b30b-174bb9870ac8	3b80691f-07ee-47ed-ad93-729aace6b52f	2026-01-15 10:55:46.149555	t
bb04956c-bac9-4014-8c71-0963b38d2dec	0ca492ed-e165-4545-b30b-174bb9870ac8	ad75bff2-30f5-4f0f-9803-b805b450e132	2026-01-15 10:55:46.149555	t
e94cff9d-c12a-4852-9bbc-b8c1b0b073ac	347d5b79-9850-4115-bc01-d695b9511b78	3b80691f-07ee-47ed-ad93-729aace6b52f	2026-01-15 19:38:29.319833	t
a8ec314a-b37c-4ecc-a439-e42665debd3c	347d5b79-9850-4115-bc01-d695b9511b78	ad75bff2-30f5-4f0f-9803-b805b450e132	2026-01-15 19:38:29.319833	t
8719ccf2-eb29-4a38-8038-4565544e5072	6a1c9b0a-b937-4b49-8504-a82889b67074	45ae7720-4d5d-424a-acd2-bace3b9400a0	2026-01-19 11:04:02.301797	t
7749ebe7-995c-4100-b483-248294549c10	6a1c9b0a-b937-4b49-8504-a82889b67074	ad75bff2-30f5-4f0f-9803-b805b450e132	2026-01-19 11:04:02.301797	t
f2140daf-269f-41c4-88c1-aee14d40d0a4	6a1c9b0a-b937-4b49-8504-a82889b67074	3b80691f-07ee-47ed-ad93-729aace6b52f	2026-01-19 11:04:02.301797	t
8193f1a2-9d7d-4c07-a62f-fd72c3a34664	0ba64def-6651-48bf-b9e8-0c365f8a59a7	3b80691f-07ee-47ed-ad93-729aace6b52f	2026-01-19 12:47:51.726945	t
fbcff922-c47a-457b-b6f1-26ebcd9c6088	0ba64def-6651-48bf-b9e8-0c365f8a59a7	45ae7720-4d5d-424a-acd2-bace3b9400a0	2026-01-19 12:47:51.726945	t
d31f5acb-f416-4d9a-b482-408aeedf375f	0ba64def-6651-48bf-b9e8-0c365f8a59a7	ad75bff2-30f5-4f0f-9803-b805b450e132	2026-01-19 12:47:51.726945	t
85a1e7b5-21f2-4e2e-9215-e3d401d2ac77	078cb006-e2fc-47d9-a9ad-25602f18628a	3b80691f-07ee-47ed-ad93-729aace6b52f	2026-01-20 12:52:01.307185	t
a2148145-b1d1-455f-a3e6-3e695316a466	078cb006-e2fc-47d9-a9ad-25602f18628a	90a68a92-49c9-425f-9e2b-7a22f5ae44dd	2026-01-20 12:52:01.307185	t
edcec55c-6a61-416b-aa82-2697c1fba181	078cb006-e2fc-47d9-a9ad-25602f18628a	0b99be51-7468-4217-8c96-70820ee30459	2026-01-20 12:52:01.307185	t
\.


--
-- Data for Name: assegnazioni_progetto; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.assegnazioni_progetto (id, progetto_id, utente_id, ore_assegnate, data_assegnazione, attivo) FROM stdin;
ee7faae4-f8bf-400d-9780-8162cbdbb388	902bd953-80ed-4b5e-b1f6-c3980b8810d6	88e88c2b-f1ec-4a97-9143-2033e7476626	1000	2026-01-14 15:13:14.219466	t
760bb7b9-cd07-429e-b39d-6f31a10dd6c4	52c12f05-5351-4e88-80e4-d7caba4d15bf	3b80691f-07ee-47ed-ad93-729aace6b52f	2400	2026-01-15 11:10:22.718114	t
80faa332-ed90-4113-8330-9b48733262e4	52c12f05-5351-4e88-80e4-d7caba4d15bf	ad75bff2-30f5-4f0f-9803-b805b450e132	2400	2026-01-15 11:10:55.313576	t
788ef2df-30ac-4efc-985f-2496f5f0989f	52c12f05-5351-4e88-80e4-d7caba4d15bf	88e88c2b-f1ec-4a97-9143-2033e7476626	2400	2026-01-15 11:13:15.585332	t
bab0e437-6e3e-46d0-b305-724f23718ae3	353966b5-cf8e-416f-ac57-6aba1553f48b	45ae7720-4d5d-424a-acd2-bace3b9400a0	2400	2026-01-19 11:04:35.639799	t
7102af06-6836-478a-86ff-9081d38648b4	353966b5-cf8e-416f-ac57-6aba1553f48b	3b80691f-07ee-47ed-ad93-729aace6b52f	2400	2026-01-19 11:05:19.02928	t
cad97d86-69d2-44a4-8fac-9550b70247a6	685aabda-cdfb-40f8-9024-83e7061ab13b	fee2c0af-8e93-486b-b370-659baeac5e93	2400	2026-01-19 12:59:05.867221	t
f2c65374-dcb4-461c-a1b0-b23b7c013d88	353966b5-cf8e-416f-ac57-6aba1553f48b	ad75bff2-30f5-4f0f-9803-b805b450e132	2400	2026-01-19 14:46:52.201006	t
c09a64ba-1cfd-4722-b8be-b10da25577ff	685aabda-cdfb-40f8-9024-83e7061ab13b	3b80691f-07ee-47ed-ad93-729aace6b52f	2400	2026-01-19 15:53:30.460535	t
af6593bf-fecd-4d46-81a0-75f5eb22c871	353966b5-cf8e-416f-ac57-6aba1553f48b	88e88c2b-f1ec-4a97-9143-2033e7476626	2400	2026-01-20 10:07:55.682228	t
47ac713a-ffcf-48ce-8246-ed9c7656a9bc	87da4b5e-59cb-453e-9fb5-4b72ded6c173	88e88c2b-f1ec-4a97-9143-2033e7476626	2400	2026-01-20 10:12:53.316205	t
70a3a9c5-0745-429d-8f32-3d3c1535fafc	685aabda-cdfb-40f8-9024-83e7061ab13b	88e88c2b-f1ec-4a97-9143-2033e7476626	2400	2026-01-20 10:34:28.715013	t
5a562bca-385e-45b5-bf1b-893c02ff865e	9301754f-bada-45d7-88e0-c1ac52b71120	3b80691f-07ee-47ed-ad93-729aace6b52f	2400	2026-01-20 12:53:08.309395	t
f0374d08-2228-4e5a-a2be-162de1f2d27f	9301754f-bada-45d7-88e0-c1ac52b71120	88e88c2b-f1ec-4a97-9143-2033e7476626	2400	2026-01-20 13:16:52.55689	t
45fbb1ee-25a7-4978-b2df-f3de6e1da441	902bd953-80ed-4b5e-b1f6-c3980b8810d6	90a68a92-49c9-425f-9e2b-7a22f5ae44dd	2400	2026-01-21 16:59:10.946877	t
\.


--
-- Data for Name: attivita; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.attivita (id, nome, descrizione, progetto_id, ore_stimate, ore_effettive, stato, scadenza, data_creazione, data_aggiornamento, creata_da, attivo) FROM stdin;
6a1c9b0a-b937-4b49-8504-a82889b67074	Attività prova cliente reale		353966b5-cf8e-416f-ac57-6aba1553f48b	260	585	completata	2026-01-21 20:00:00	2026-01-19 11:04:02.301797	2026-01-20 10:32:04.074392	fee2c0af-8e93-486b-b370-659baeac5e93	t
617d710b-480e-4205-a477-a97a9ea599f3	gjdkddfasad		52c12f05-5351-4e88-80e4-d7caba4d15bf	0	36	in_esecuzione	2026-01-30 20:00:00	2026-01-15 10:20:05.270985	2026-01-20 13:12:10.998733	88e88c2b-f1ec-4a97-9143-2033e7476626	t
347d5b79-9850-4115-bc01-d695b9511b78	Attività creata da test		87da4b5e-59cb-453e-9fb5-4b72ded6c173	240	1020	pianificata	2026-01-30 20:00:00	2026-01-15 19:38:29.319833	2026-01-20 13:12:25.606028	88e88c2b-f1ec-4a97-9143-2033e7476626	t
078cb006-e2fc-47d9-a9ad-25602f18628a	Attività prova final	Attività prova final	9301754f-bada-45d7-88e0-c1ac52b71120	1440	780	completata	2026-03-31 20:00:00	2026-01-20 12:52:01.307185	2026-01-20 13:30:12.929396	88e88c2b-f1ec-4a97-9143-2033e7476626	t
0ba64def-6651-48bf-b9e8-0c365f8a59a7	Attività progetto cliente prova 3		685aabda-cdfb-40f8-9024-83e7061ab13b	800	950	pianificata	2026-01-22 18:00:00	2026-01-19 12:47:51.726945	2026-01-20 14:16:09.576849	fee2c0af-8e93-486b-b370-659baeac5e93	t
9942c8ec-f3f9-453a-9d49-8842b5e02197	Setup Iniziale	Configurazione ambiente e setup progetto	902bd953-80ed-4b5e-b1f6-c3980b8810d6	30	110	completata	2026-01-21 15:09:19.301763	2026-01-14 15:09:19.301763	2026-01-20 15:02:39.219516	88e88c2b-f1ec-4a97-9143-2033e7476626	t
0ca492ed-e165-4545-b30b-174bb9870ac8	55555555555555555		902bd953-80ed-4b5e-b1f6-c3980b8810d6	\N	0	completata	2027-12-30 18:00:00	2026-01-15 10:55:46.149555	2026-01-21 17:28:23.810311	88e88c2b-f1ec-4a97-9143-2033e7476626	t
928f118a-4b00-4cfc-8fc3-036478095388	Sviluppo Backend	API REST e database PostgreSQL	902bd953-80ed-4b5e-b1f6-c3980b8810d6	65	16	in_esecuzione	2026-02-04 15:09:19.301763	2026-01-14 15:09:19.301763	2026-01-19 12:37:30.860679	88e88c2b-f1ec-4a97-9143-2033e7476626	t
ce7b9d16-e0d4-4453-8325-5958e63f7561	Sviluppo Frontend	Creazione interfaccia utente React	902bd953-80ed-4b5e-b1f6-c3980b8810d6	135	32	completata	2026-01-28 15:09:19.301763	2026-01-14 15:09:19.301763	2026-01-21 17:34:54.637938	88e88c2b-f1ec-4a97-9143-2033e7476626	t
\.


--
-- Data for Name: clienti; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.clienti (id, nome, descrizione, budget, budget_utilizzato, stato_approvazione, approvato_da, data_approvazione, creato_da, data_creazione, data_aggiornamento, attivo) FROM stdin;
f63e53a1-f84f-48d7-a450-3bfe9849e6bc	Cliente Prova2	Cliente Prova2	100000.00	0.00	approvata	\N	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-19 10:26:16.923216	2026-01-19 10:26:16.923216	t
06795d22-86d2-4e60-8e08-f9642163ae6a	Acme Corporation	Cliente principale per sviluppo software	100000.00	55000.00	approvata	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:09:19.298257	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:09:19.298257	2026-01-19 10:52:06.711741	t
a188c831-eb44-4319-9014-774f1ce2b19f	asdasdasdsadsada	asdasdas	100000.00	50100.00	approvata	\N	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-19 10:17:28.17182	2026-01-19 11:55:05.971765	t
a0f22388-a4ae-4692-9bd0-9a058dbfdfa5	Cliente prova final	Cliente prova final	100000.00	40000.00	approvata	\N	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-20 12:50:26.749553	2026-01-20 12:51:02.470345	t
4fe30bfb-edb1-425b-b3b6-41f36e1fb07f	Cliente prova 3		50000.00	30089.00	approvata	\N	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-19 12:46:01.69711	2026-01-21 10:14:52.726673	t
\.


--
-- Data for Name: progetti; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.progetti (id, nome, descrizione, cliente_id, budget_assegnato, budget_utilizzato, stato_approvazione, approvato_da, data_approvazione, data_inizio, data_fine, scadenza, creato_da, data_creazione, data_aggiornamento, attivo) FROM stdin;
902bd953-80ed-4b5e-b1f6-c3980b8810d6	Sistema Management	Sviluppo sistema gestione team	06795d22-86d2-4e60-8e08-f9642163ae6a	50000.00	0.00	approvata	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:09:19.299999	2026-01-14	2026-07-14	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:09:19.299999	2026-01-14 15:09:19.299999	t
52c12f05-5351-4e88-80e4-d7caba4d15bf	Test Progetto Frontend	Progetto di test per verificare creazione attività	06795d22-86d2-4e60-8e08-f9642163ae6a	15000.00	0.00	approvata	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 17:32:54.392165	2026-01-14	2026-03-14	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 17:32:54.392165	2026-01-14 17:32:54.392165	t
87da4b5e-59cb-453e-9fb5-4b72ded6c173	Progetto Test		06795d22-86d2-4e60-8e08-f9642163ae6a	10000.00	0.00	approvata	\N	\N	2026-01-15	2026-01-30	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-15 19:30:47.834765	2026-01-15 19:30:47.834765	t
268d5b6d-13c4-43be-b97b-61a1a801e1ec	Proggetto prova 2		06795d22-86d2-4e60-8e08-f9642163ae6a	35000.00	0.00	approvata	\N	\N	2026-01-15	2026-01-16	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-15 19:49:31.001188	2026-01-15 19:49:31.001188	t
55d83d5d-9740-471c-9cea-56a1529df5e6	asdasdasdasdas		06795d22-86d2-4e60-8e08-f9642163ae6a	10000.00	0.00	approvata	\N	\N	2026-01-19	2026-01-23	\N	fee2c0af-8e93-486b-b370-659baeac5e93	2026-01-19 10:52:06.711741	2026-01-19 10:52:06.711741	t
353966b5-cf8e-416f-ac57-6aba1553f48b	Progetto prova cliente reale	prova	a188c831-eb44-4319-9014-774f1ce2b19f	100.00	0.00	approvata	\N	\N	2026-01-19	2026-01-30	\N	fee2c0af-8e93-486b-b370-659baeac5e93	2026-01-19 11:03:24.312156	2026-01-19 11:03:24.312156	t
2116f02b-4546-46f1-986a-c6d18237e8cc	Progetto test 2		a188c831-eb44-4319-9014-774f1ce2b19f	50000.00	0.00	approvata	\N	\N	2026-01-19	2026-01-30	\N	fee2c0af-8e93-486b-b370-659baeac5e93	2026-01-19 11:55:05.971765	2026-01-19 11:55:05.971765	t
685aabda-cdfb-40f8-9024-83e7061ab13b	Progetto cliente prova 3		4fe30bfb-edb1-425b-b3b6-41f36e1fb07f	30000.00	0.00	approvata	\N	\N	2026-01-19	2026-01-23	\N	fee2c0af-8e93-486b-b370-659baeac5e93	2026-01-19 12:46:55.571397	2026-01-19 12:46:55.571397	t
9301754f-bada-45d7-88e0-c1ac52b71120	Progetto Prova final	Progetto Prova final	a0f22388-a4ae-4692-9bd0-9a058dbfdfa5	40000.00	0.00	approvata	\N	\N	2026-01-20	2028-08-01	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-20 12:51:02.470345	2026-01-20 12:51:02.470345	t
ac6b548b-3044-4af5-a812-884df8413d68	prova progetto		4fe30bfb-edb1-425b-b3b6-41f36e1fb07f	89.00	0.00	approvata	\N	\N	2026-01-21	2026-01-24	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-21 10:14:52.726673	2026-01-21 10:14:52.726673	t
\.


--
-- Data for Name: riassegnazioni_ore; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.riassegnazioni_ore (id, task_sorgente_id, minuti_prelevati, task_destinazione_id, attivita_destinazione_id, progetto_destinazione_id, minuti_assegnati, creato_da, motivo, data_riassegnazione, stato, data_annullamento, annullato_da, motivo_annullamento) FROM stdin;
3341b0e4-22a7-47ad-bdb5-199d8c7177e0	a1e14c7c-263b-46d1-b62b-1674659df4a3	5	72904cc8-b892-4309-ab11-9e97ed9f193c	\N	685aabda-cdfb-40f8-9024-83e7061ab13b	5	fee2c0af-8e93-486b-b370-659baeac5e93	eccedenza mario rossi	2026-01-19 16:39:10.799378	attiva	\N	\N	\N
9c510ea0-39ae-4c98-b069-524038cf531d	a093b31a-dd63-44b6-8472-ee7c7d7556c6	28	ba529dfe-ca5c-4438-a2a8-cc223217b090	\N	685aabda-cdfb-40f8-9024-83e7061ab13b	28	fee2c0af-8e93-486b-b370-659baeac5e93	regalo 	2026-01-19 16:41:12.036345	attiva	\N	\N	\N
99160474-6b7c-449b-bd72-9db44e652946	7be5ee82-9ca5-4adc-9bb7-5e43b70f461a	40	72904cc8-b892-4309-ab11-9e97ed9f193c	\N	685aabda-cdfb-40f8-9024-83e7061ab13b	40	fee2c0af-8e93-486b-b370-659baeac5e93	regalo	2026-01-19 16:42:13.0874	attiva	\N	\N	\N
646f7248-6957-4665-b211-1d98482a30e0	a5be5385-0278-4f4c-a342-da40535c4e82	1	72904cc8-b892-4309-ab11-9e97ed9f193c	\N	685aabda-cdfb-40f8-9024-83e7061ab13b	1	88e88c2b-f1ec-4a97-9143-2033e7476626	asdasdasd	2026-01-20 09:39:49.356066	annullata	2026-01-20 12:48:09.219261	88e88c2b-f1ec-4a97-9143-2033e7476626	ho cambiato idea
bff5c101-b4b7-4719-9532-b4e54840e9b5	5fb75803-e147-4517-9385-38cb6c2422eb	60	72904cc8-b892-4309-ab11-9e97ed9f193c	\N	685aabda-cdfb-40f8-9024-83e7061ab13b	60	88e88c2b-f1ec-4a97-9143-2033e7476626	adsadas	2026-01-20 13:22:19.601742	annullata	2026-01-20 13:56:05.800163	88e88c2b-f1ec-4a97-9143-2033e7476626	non mi convince
6fdef947-e278-4a3e-b29a-6cc8b942ec7e	5fb75803-e147-4517-9385-38cb6c2422eb	60	ba529dfe-ca5c-4438-a2a8-cc223217b090	\N	685aabda-cdfb-40f8-9024-83e7061ab13b	60	88e88c2b-f1ec-4a97-9143-2033e7476626	prova compensazione	2026-01-20 13:20:09.029244	annullata	2026-01-21 15:14:35.732203	88e88c2b-f1ec-4a97-9143-2033e7476626	ho cambiato idea
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.task (id, nome, descrizione, attivita_id, utente_assegnato, ore_stimate, ore_effettive, stato, scadenza, task_collegata_id, task_madre_id, data_creazione, data_completamento, data_aggiornamento, creata_da, task_collegata_config, priorita, attivo) FROM stdin;
386dc9e1-741a-4a00-b1e1-12cf6ebd6aa4	task figlia 3	asdasdas	0ba64def-6651-48bf-b9e8-0c365f8a59a7	88e88c2b-f1ec-4a97-9143-2033e7476626	50	\N	programmata	2026-01-23 10:00:00	\N	384f271f-c958-4509-87d5-bdbc74b8c9f3	2026-01-20 13:10:45.454723	\N	2026-01-20 13:10:45.454723	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
384f271f-c958-4509-87d5-bdbc74b8c9f3	task madre 3		0ba64def-6651-48bf-b9e8-0c365f8a59a7	88e88c2b-f1ec-4a97-9143-2033e7476626	30	30	completata	2026-01-20 15:00:00	386dc9e1-741a-4a00-b1e1-12cf6ebd6aa4	\N	2026-01-20 11:03:38.845945	2026-01-20 13:10:45.454723	2026-01-20 13:10:45.454723	88e88c2b-f1ec-4a97-9143-2033e7476626	{"nome": "task figlia 3", "priorita": "medium", "scadenza": "2026-01-23T10:00:00.000Z", "descrizione": "asdasdas", "ore_stimate": 50, "scadenza_ora": "10:00", "stimate_mode": "minutes", "scadenza_data": "2026-01-23", "utente_assegnato": "88e88c2b-f1ec-4a97-9143-2033e7476626"}	medium	t
72904cc8-b892-4309-ab11-9e97ed9f193c	Prova Mario Rossi Oggi		0ba64def-6651-48bf-b9e8-0c365f8a59a7	3b80691f-07ee-47ed-ad93-729aace6b52f	360	480	completata	2026-01-19 18:00:00	\N	\N	2026-01-19 15:53:30.460535	2026-01-20 13:16:16.8692	2026-01-20 13:16:16.8692	fee2c0af-8e93-486b-b370-659baeac5e93	\N	medium	t
4b4abac5-c5b6-4725-adc8-446e9028b857	Task Mario rossi nuova	asdasdsa	078cb006-e2fc-47d9-a9ad-25602f18628a	88e88c2b-f1ec-4a97-9143-2033e7476626	480	480	completata	2026-01-20 18:00:00	\N	\N	2026-01-20 13:16:52.55689	2026-01-20 13:17:00.52373	2026-01-20 13:17:00.52373	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
5fb75803-e147-4517-9385-38cb6c2422eb	Prova task riassegnazione mario rossi		078cb006-e2fc-47d9-a9ad-25602f18628a	3b80691f-07ee-47ed-ad93-729aace6b52f	480	300	completata	2026-01-21 18:00:00	\N	\N	2026-01-20 13:18:36.09831	2026-01-20 13:18:47.848497	2026-01-20 13:18:47.848497	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
a5be5385-0278-4f4c-a342-da40535c4e82	prova task scadenxa oggi	asdasdsad	928f118a-4b00-4cfc-8fc3-036478095388	88e88c2b-f1ec-4a97-9143-2033e7476626	5	1	completata	2026-01-14 18:00:00	\N	\N	2026-01-14 16:34:02.033292	\N	2026-01-14 17:02:43.867108	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
0773679f-c605-45ae-8b04-f8d092d21a19	task prova		ce7b9d16-e0d4-4453-8325-5958e63f7561	90a68a92-49c9-425f-9e2b-7a22f5ae44dd	60	\N	completata	2026-01-21 18:00:00	\N	\N	2026-01-21 16:59:10.946877	\N	2026-01-21 16:59:51.38791	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
a093b31a-dd63-44b6-8472-ee7c7d7556c6	1231231231231232123		ce7b9d16-e0d4-4453-8325-5958e63f7561	88e88c2b-f1ec-4a97-9143-2033e7476626	60	32	completata	2026-01-30 18:00:00	\N	\N	2026-01-15 10:26:24.474856	2026-01-15 18:44:36.391805	2026-01-15 18:44:36.391805	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
7be5ee82-9ca5-4adc-9bb7-5e43b70f461a	prova task nuova nuova	asdasdasdas	928f118a-4b00-4cfc-8fc3-036478095388	88e88c2b-f1ec-4a97-9143-2033e7476626	60	15	completata	2026-01-16 18:00:00	\N	\N	2026-01-15 09:20:01.805251	2026-01-15 18:45:57.586251	2026-01-15 18:45:57.586251	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
becea789-8c61-42b9-84a2-94e93d69f82f	Task cliente reale	prova attività	6a1c9b0a-b937-4b49-8504-a82889b67074	45ae7720-4d5d-424a-acd2-bace3b9400a0	30	15	completata	2026-01-20 18:00:00	\N	\N	2026-01-19 11:04:35.639799	2026-01-19 11:04:46.989955	2026-01-19 11:04:46.989955	fee2c0af-8e93-486b-b370-659baeac5e93	\N	medium	t
a1e14c7c-263b-46d1-b62b-1674659df4a3	Task prova cliente reale 2		6a1c9b0a-b937-4b49-8504-a82889b67074	3b80691f-07ee-47ed-ad93-729aace6b52f	60	30	completata	2026-01-19 18:00:00	\N	\N	2026-01-19 11:05:19.02928	2026-01-19 11:05:46.827096	2026-01-19 11:05:46.827096	fee2c0af-8e93-486b-b370-659baeac5e93	\N	medium	t
beb41d41-3a99-49ff-96da-8d597711a5c9	prpova task user nuovo		6a1c9b0a-b937-4b49-8504-a82889b67074	ad75bff2-30f5-4f0f-9803-b805b450e132	50	120	completata	2026-01-19 18:00:00	\N	\N	2026-01-19 14:46:52.201006	2026-01-19 14:47:07.222394	2026-01-19 14:47:07.222394	fee2c0af-8e93-486b-b370-659baeac5e93	\N	medium	t
ba529dfe-ca5c-4438-a2a8-cc223217b090	Prova task oggi Mario Rossi		0ba64def-6651-48bf-b9e8-0c365f8a59a7	fee2c0af-8e93-486b-b370-659baeac5e93	120	360	completata	2026-01-19 18:00:00	\N	\N	2026-01-19 15:52:08.330705	2026-01-19 15:52:17.427028	2026-01-19 15:52:17.427028	fee2c0af-8e93-486b-b370-659baeac5e93	\N	medium	t
7717c96a-f658-4f8a-8781-7a06d5bfa943	Task collegata 1	asadasdasdas	347d5b79-9850-4115-bc01-d695b9511b78	88e88c2b-f1ec-4a97-9143-2033e7476626	120	600	completata	2026-01-20 18:00:00	\N	\N	2026-01-20 10:26:06.130857	2026-01-20 10:26:18.584576	2026-01-20 10:26:18.584576	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
75afc79a-f22d-4581-a9ec-233de1d1b833	task collegata 1	asdasdasdsa	347d5b79-9850-4115-bc01-d695b9511b78	88e88c2b-f1ec-4a97-9143-2033e7476626	120	300	completata	2026-01-20 18:00:00	\N	\N	2026-01-20 10:31:10.071751	2026-01-20 10:31:26.659715	2026-01-20 10:31:26.659715	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
0a63e96b-99c7-4287-bf53-37a8810de924	Task collegate	task collegate	6a1c9b0a-b937-4b49-8504-a82889b67074	88e88c2b-f1ec-4a97-9143-2033e7476626	120	420	completata	2026-01-20 18:00:00	\N	\N	2026-01-20 10:07:55.682228	2026-01-20 10:32:04.074392	2026-01-20 10:32:04.074392	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
5da10125-7eef-4083-832a-5e6a0fc5d47e	task collegata 10	asdasdsa	0ba64def-6651-48bf-b9e8-0c365f8a59a7	88e88c2b-f1ec-4a97-9143-2033e7476626	45	10	completata	2026-01-20 18:00:00	\N	\N	2026-01-20 10:34:28.715013	2026-01-20 10:34:40.128155	2026-01-20 10:34:40.128155	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
3f0ae183-b8c4-483c-bb0f-7eff8b5607cb	Task Madre Test	Task Madre Test	0ba64def-6651-48bf-b9e8-0c365f8a59a7	88e88c2b-f1ec-4a97-9143-2033e7476626	30	10	completata	2026-01-20 20:00:00	\N	\N	2026-01-20 10:41:59.448263	2026-01-20 10:42:13.643487	2026-01-20 10:42:13.643487	88e88c2b-f1ec-4a97-9143-2033e7476626	{"nome": "Task Figlia Automatica", "priorita": "medium", "scadenza": "2026-01-22T20:00:00.000Z", "descrizione": "Task Figlia Automatica", "ore_stimate": 45, "scadenza_ora": "20:00", "stimate_mode": "minutes", "scadenza_data": "2026-01-22", "utente_assegnato": "2"}	medium	t
4f4cbfcb-3d71-4672-af22-a731825f9b1a	task madre	task madre	0ba64def-6651-48bf-b9e8-0c365f8a59a7	88e88c2b-f1ec-4a97-9143-2033e7476626	30	15	completata	2026-01-20 18:00:00	\N	\N	2026-01-20 10:45:38.056527	2026-01-20 10:52:50.18826	2026-01-20 10:52:50.18826	88e88c2b-f1ec-4a97-9143-2033e7476626	{"nome": "task figlio", "priorita": "high", "scadenza": "2026-01-30T18:00:00.000Z", "descrizione": "asdasdas", "ore_stimate": 50, "scadenza_ora": "18:00", "stimate_mode": "minutes", "scadenza_data": "2026-01-30", "utente_assegnato": "1"}	medium	t
3146cbaa-93dc-4357-9087-235f5f8c4d2a	Task Figlia Automatica	Task Figlia Automatica	0ba64def-6651-48bf-b9e8-0c365f8a59a7	0b99be51-7468-4217-8c96-70820ee30459	30	\N	programmata	2026-01-30 18:00:00	\N	d5152adb-7276-4a0f-8f3d-8029eebf68fc	2026-01-20 11:09:07.420154	\N	2026-01-20 11:09:07.420154	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	urgent	t
d5152adb-7276-4a0f-8f3d-8029eebf68fc	Task Madre Test Finale	Task Madre Test Finale	0ba64def-6651-48bf-b9e8-0c365f8a59a7	88e88c2b-f1ec-4a97-9143-2033e7476626	30	30	completata	2026-01-21 20:00:00	3146cbaa-93dc-4357-9087-235f5f8c4d2a	\N	2026-01-20 11:09:01.424176	2026-01-20 11:09:07.420154	2026-01-20 11:09:07.420154	88e88c2b-f1ec-4a97-9143-2033e7476626	{"nome": "Task Figlia Automatica", "priorita": "urgent", "scadenza": "2026-01-30T18:00:00.000Z", "descrizione": "Task Figlia Automatica", "ore_stimate": 30, "scadenza_ora": "18:00", "stimate_mode": "minutes", "scadenza_data": "2026-01-30", "utente_assegnato": "0b99be51-7468-4217-8c96-70820ee30459"}	medium	t
7aad42bb-e865-4ece-bcbd-bd3ebd489273	prova task scadenza breve	asdasdas	ce7b9d16-e0d4-4453-8325-5958e63f7561	88e88c2b-f1ec-4a97-9143-2033e7476626	15	\N	completata	2026-01-15 18:00:00	\N	\N	2026-01-14 16:33:46.157402	\N	2026-01-20 12:26:56.097875	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
94bbc5dc-4f2b-4bc2-be30-2a16bae8a28e	Task figlia final	Task figlia final	0ba64def-6651-48bf-b9e8-0c365f8a59a7	0b99be51-7468-4217-8c96-70820ee30459	30	\N	in_esecuzione	2026-01-22 12:00:00	\N	9a9502ec-0512-4498-8be8-76261dcc4d3a	2026-01-20 12:04:27.308918	\N	2026-01-20 12:27:05.625662	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	urgent	t
9a9502ec-0512-4498-8be8-76261dcc4d3a	Task Madre final	Task Madre final	0ba64def-6651-48bf-b9e8-0c365f8a59a7	88e88c2b-f1ec-4a97-9143-2033e7476626	45	15	completata	2026-01-20 13:00:00	94bbc5dc-4f2b-4bc2-be30-2a16bae8a28e	\N	2026-01-20 12:04:19.251841	2026-01-20 12:04:27.308918	2026-01-20 12:04:27.308918	88e88c2b-f1ec-4a97-9143-2033e7476626	{"nome": "Task figlia final", "priorita": "urgent", "scadenza": "2026-01-22T12:00:00.000Z", "descrizione": "Task figlia final", "ore_stimate": 30, "scadenza_ora": "12:00", "stimate_mode": "minutes", "scadenza_data": "2026-01-22", "utente_assegnato": "0b99be51-7468-4217-8c96-70820ee30459"}	medium	t
63ed8a65-526f-409b-ba17-d0bd70b0115c	Task final Mario rossi		078cb006-e2fc-47d9-a9ad-25602f18628a	3b80691f-07ee-47ed-ad93-729aace6b52f	480	\N	completata	2026-01-20 18:00:00	\N	\N	2026-01-20 13:13:47.751302	\N	2026-01-20 13:15:21.286254	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
36cc82b4-1471-4579-aa6c-229717b2d8aa	Task mia per calendario		9942c8ec-f3f9-453a-9d49-8842b5e02197	88e88c2b-f1ec-4a97-9143-2033e7476626	30	\N	in_esecuzione	2026-01-20 16:00:00	\N	\N	2026-01-20 15:02:39.219516	\N	2026-01-20 15:03:18.408666	88e88c2b-f1ec-4a97-9143-2033e7476626	\N	medium	t
\.


--
-- Data for Name: timesheet; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.timesheet (id, utente_id, task_id, data, ore_lavorate, descrizione, data_registrazione, attivo) FROM stdin;
\.


--
-- Data for Name: utenti; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.utenti (id, nome, email, password_hash, ruolo, compenso_annuale, costo_orario, attivo, data_creazione, data_aggiornamento, ore_disponibili_anno, costo_orario_manuale, ore_disponibili_manuale) FROM stdin;
3b80691f-07ee-47ed-ad93-729aace6b52f	Mario Rossi	mario@team.com	$2b$12$LQv3c1yqBwlVHpPjrPyFUOHXfxvxUDAHL.UkeF/An4U16Q3HDbLHG	risorsa	35000.00	15.91	t	2026-01-14 14:45:48.259297	2026-01-14 14:45:48.259297	1760	f	f
a70a2261-a145-4239-bd38-157139f9e02a	Test Manager	test@team.com	$2b$10$vI8aWBnW3fID.w.mscgPmOKpP6.zYb8YXm9K0w9j0u9K9U9gJWWZu	manager	50000.00	22.73	t	2026-01-14 14:55:42.783015	2026-01-14 14:55:42.783015	1760	f	f
1d237e1b-58c0-4e42-bcf3-36799a64c074	Manager Sistema	manager@team.com	$2b$10$N9qo8uLOickgx2ZMRZoMye5pO6laQhUzwQUGgvxVc5oq0S/46SQMq	manager	50000.00	22.73	t	2026-01-14 14:45:48.259297	2026-01-14 14:45:48.259297	1760	f	f
0b99be51-7468-4217-8c96-70820ee30459	Risorsa manuale	risorsamanuale@tam.com	$2a$12$XqjZp3fXMK0tjKCFV1jLBOoa0Y2fRa6cnK1/6uk7S4u9gZkZ1YnuC	risorsa	50000.00	45.45	t	2026-01-19 15:12:04.719302	2026-01-19 17:24:08.610923	2000	f	t
2d0e0a02-38c3-457e-94b9-fbd6076e7eb6	Utente prova oggi	prova@prova.it	$2a$12$Xaa5YLzsKQoHN4UzYV2F5OQiiF7FsC9Z2t1s8Lwz5sCdXymfGU1j2	risorsa	10000.00	9.09	t	2026-01-20 09:38:52.041664	2026-01-20 09:38:52.041664	1760	f	f
88e88c2b-f1ec-4a97-9143-2033e7476626	Test Manager	testmanager@team.com	$2a$12$38PfmzO58oZTxUMb1SR1YuTnW2NG3U4JTQHq45RPCqVtHwrHpu4a2	manager	50000.00	45.45	t	2026-01-14 14:59:41.710699	2026-01-21 14:38:04.503265	1760	f	f
d3cf3895-ec52-4eb3-9922-98fc0fad587e	asdasdsadasdas	asdasdasdasdsada@asdasdsa.iy	$2a$12$b6T2Zres0zvWTZLbgMJyz.KD8rVkrvtzmOKe4CgJnudoiDS00nap.	risorsa	1000.00	0.91	f	2026-01-21 10:24:23.10933	2026-01-21 16:57:47.149609	1760	f	f
ad75bff2-30f5-4f0f-9803-b805b450e132	Test User Nuovo	testuser@example.com	$2a$12$nBmVkJClpSp7PZdrpRdV0OK0e5.rffubgBZgxJsL.Uytwk8AwL45C	risorsa	30000.00	27.27	f	2026-01-15 09:32:39.387613	2026-01-21 16:58:05.008685	1760	f	f
cd74229b-858e-41c4-8051-9b77dcac956c	Utente prova task	utenteprovatask@prova.it	$2a$12$BViTe8dVIr7tAxgUbk4l8.5gAEnuGzNut68V611eg.rky2K35m6zu	risorsa	10000.00	9.09	f	2026-01-20 12:05:58.071727	2026-01-21 16:58:16.483982	1760	f	f
45ae7720-4d5d-424a-acd2-bace3b9400a0	Test User	prova@team.com	$2a$12$aFHmpWhABeZqt.NndTMPbOuyufL..Mvffxk805GI3nNqlgbd8mKRa	risorsa	45000.00	40.91	t	2026-01-19 09:51:25.898612	2026-01-19 09:51:25.898612	1760	f	f
90a68a92-49c9-425f-9e2b-7a22f5ae44dd	Risorsa 1	risorsa@team.com	$2a$12$/KNHQDSc5oDXOlIsNsnd6e3c8acsQaCNxX2XY2cS/9Vjln7dkbJCG	risorsa	50000.00	45.45	f	2026-01-19 13:02:01.042131	2026-01-21 17:00:14.401456	1760	f	f
fee2c0af-8e93-486b-b370-659baeac5e93	Manager Test	manager2@team.com	$2a$12$38PfmzO58oZTxUMb1SR1YuTnW2NG3U4JTQHq45RPCqVtHwrHpu4a2	manager	45000.00	40.91	t	2026-01-19 09:53:09.839483	2026-01-19 10:13:53.788126	1760	f	f
\.


--
-- Name: assegnazioni_attivita assegnazioni_attivita_pkey; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.assegnazioni_attivita
    ADD CONSTRAINT assegnazioni_attivita_pkey PRIMARY KEY (id);


--
-- Name: assegnazioni_progetto assegnazioni_progetto_pkey; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.assegnazioni_progetto
    ADD CONSTRAINT assegnazioni_progetto_pkey PRIMARY KEY (id);


--
-- Name: attivita attivita_pkey; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.attivita
    ADD CONSTRAINT attivita_pkey PRIMARY KEY (id);


--
-- Name: clienti clienti_pkey; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.clienti
    ADD CONSTRAINT clienti_pkey PRIMARY KEY (id);


--
-- Name: progetti progetti_pkey; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.progetti
    ADD CONSTRAINT progetti_pkey PRIMARY KEY (id);


--
-- Name: riassegnazioni_ore riassegnazioni_ore_pkey; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.riassegnazioni_ore
    ADD CONSTRAINT riassegnazioni_ore_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- Name: timesheet timesheet_pkey; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.timesheet
    ADD CONSTRAINT timesheet_pkey PRIMARY KEY (id);


--
-- Name: utenti utenti_email_key; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.utenti
    ADD CONSTRAINT utenti_email_key UNIQUE (email);


--
-- Name: utenti utenti_pkey; Type: CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.utenti
    ADD CONSTRAINT utenti_pkey PRIMARY KEY (id);


--
-- Name: idx_attivita_attivo; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_attivita_attivo ON public.attivita USING btree (attivo);


--
-- Name: idx_attivita_progetto_id; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_attivita_progetto_id ON public.attivita USING btree (progetto_id);


--
-- Name: idx_clienti_attivo; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_clienti_attivo ON public.clienti USING btree (attivo);


--
-- Name: idx_progetti_attivo; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_progetti_attivo ON public.progetti USING btree (attivo);


--
-- Name: idx_progetti_cliente_id; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_progetti_cliente_id ON public.progetti USING btree (cliente_id);


--
-- Name: idx_riassegnazioni_data; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_riassegnazioni_data ON public.riassegnazioni_ore USING btree (data_riassegnazione);


--
-- Name: idx_riassegnazioni_manager; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_riassegnazioni_manager ON public.riassegnazioni_ore USING btree (creato_da);


--
-- Name: idx_riassegnazioni_stato; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_riassegnazioni_stato ON public.riassegnazioni_ore USING btree (stato);


--
-- Name: idx_riassegnazioni_task_destinazione; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_riassegnazioni_task_destinazione ON public.riassegnazioni_ore USING btree (task_destinazione_id);


--
-- Name: idx_riassegnazioni_task_sorgente; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_riassegnazioni_task_sorgente ON public.riassegnazioni_ore USING btree (task_sorgente_id);


--
-- Name: idx_task_attivita_id; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_task_attivita_id ON public.task USING btree (attivita_id);


--
-- Name: idx_task_attivo; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_task_attivo ON public.task USING btree (attivo);


--
-- Name: idx_task_scadenza; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_task_scadenza ON public.task USING btree (scadenza);


--
-- Name: idx_task_stato; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_task_stato ON public.task USING btree (stato);


--
-- Name: idx_task_utente_assegnato; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_task_utente_assegnato ON public.task USING btree (utente_assegnato);


--
-- Name: idx_timesheet_utente_data; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_timesheet_utente_data ON public.timesheet USING btree (utente_id, data);


--
-- Name: idx_utenti_attivo; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_utenti_attivo ON public.utenti USING btree (attivo);


--
-- Name: task test_trigger_update_estimated; Type: TRIGGER; Schema: public; Owner: team_user
--

CREATE TRIGGER test_trigger_update_estimated AFTER UPDATE OF ore_stimate ON public.task FOR EACH ROW EXECUTE FUNCTION public.update_activity_estimated_hours();


--
-- Name: task trigger_task_delete_update_estimated_hours; Type: TRIGGER; Schema: public; Owner: team_user
--

CREATE TRIGGER trigger_task_delete_update_estimated_hours AFTER DELETE ON public.task FOR EACH ROW EXECUTE FUNCTION public.update_activity_estimated_hours();


--
-- Name: task trigger_task_insert_update_estimated_hours; Type: TRIGGER; Schema: public; Owner: team_user
--

CREATE TRIGGER trigger_task_insert_update_estimated_hours AFTER INSERT ON public.task FOR EACH ROW EXECUTE FUNCTION public.update_activity_estimated_hours();


--
-- Name: task trigger_task_update_actual_hours; Type: TRIGGER; Schema: public; Owner: team_user
--

CREATE TRIGGER trigger_task_update_actual_hours AFTER UPDATE OF ore_effettive, stato ON public.task FOR EACH ROW WHEN (((new.stato = 'completata'::public.stato_task) OR (old.stato = 'completata'::public.stato_task))) EXECUTE FUNCTION public.update_activity_actual_hours();


--
-- Name: assegnazioni_attivita assegnazioni_attivita_attivita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.assegnazioni_attivita
    ADD CONSTRAINT assegnazioni_attivita_attivita_id_fkey FOREIGN KEY (attivita_id) REFERENCES public.attivita(id);


--
-- Name: assegnazioni_attivita assegnazioni_attivita_utente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.assegnazioni_attivita
    ADD CONSTRAINT assegnazioni_attivita_utente_id_fkey FOREIGN KEY (utente_id) REFERENCES public.utenti(id);


--
-- Name: assegnazioni_progetto assegnazioni_progetto_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.assegnazioni_progetto
    ADD CONSTRAINT assegnazioni_progetto_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetti(id);


--
-- Name: assegnazioni_progetto assegnazioni_progetto_utente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.assegnazioni_progetto
    ADD CONSTRAINT assegnazioni_progetto_utente_id_fkey FOREIGN KEY (utente_id) REFERENCES public.utenti(id);


--
-- Name: attivita attivita_creata_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.attivita
    ADD CONSTRAINT attivita_creata_da_fkey FOREIGN KEY (creata_da) REFERENCES public.utenti(id);


--
-- Name: attivita attivita_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.attivita
    ADD CONSTRAINT attivita_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetti(id);


--
-- Name: clienti clienti_approvato_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.clienti
    ADD CONSTRAINT clienti_approvato_da_fkey FOREIGN KEY (approvato_da) REFERENCES public.utenti(id);


--
-- Name: clienti clienti_creato_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.clienti
    ADD CONSTRAINT clienti_creato_da_fkey FOREIGN KEY (creato_da) REFERENCES public.utenti(id);


--
-- Name: progetti progetti_approvato_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.progetti
    ADD CONSTRAINT progetti_approvato_da_fkey FOREIGN KEY (approvato_da) REFERENCES public.utenti(id);


--
-- Name: progetti progetti_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.progetti
    ADD CONSTRAINT progetti_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clienti(id);


--
-- Name: progetti progetti_creato_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.progetti
    ADD CONSTRAINT progetti_creato_da_fkey FOREIGN KEY (creato_da) REFERENCES public.utenti(id);


--
-- Name: riassegnazioni_ore riassegnazioni_ore_annullato_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.riassegnazioni_ore
    ADD CONSTRAINT riassegnazioni_ore_annullato_da_fkey FOREIGN KEY (annullato_da) REFERENCES public.utenti(id);


--
-- Name: riassegnazioni_ore riassegnazioni_ore_attivita_destinazione_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.riassegnazioni_ore
    ADD CONSTRAINT riassegnazioni_ore_attivita_destinazione_id_fkey FOREIGN KEY (attivita_destinazione_id) REFERENCES public.attivita(id);


--
-- Name: riassegnazioni_ore riassegnazioni_ore_creato_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.riassegnazioni_ore
    ADD CONSTRAINT riassegnazioni_ore_creato_da_fkey FOREIGN KEY (creato_da) REFERENCES public.utenti(id);


--
-- Name: riassegnazioni_ore riassegnazioni_ore_progetto_destinazione_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.riassegnazioni_ore
    ADD CONSTRAINT riassegnazioni_ore_progetto_destinazione_id_fkey FOREIGN KEY (progetto_destinazione_id) REFERENCES public.progetti(id);


--
-- Name: riassegnazioni_ore riassegnazioni_ore_task_destinazione_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.riassegnazioni_ore
    ADD CONSTRAINT riassegnazioni_ore_task_destinazione_id_fkey FOREIGN KEY (task_destinazione_id) REFERENCES public.task(id);


--
-- Name: riassegnazioni_ore riassegnazioni_ore_task_sorgente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.riassegnazioni_ore
    ADD CONSTRAINT riassegnazioni_ore_task_sorgente_id_fkey FOREIGN KEY (task_sorgente_id) REFERENCES public.task(id);


--
-- Name: task task_attivita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_attivita_id_fkey FOREIGN KEY (attivita_id) REFERENCES public.attivita(id);


--
-- Name: task task_creata_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_creata_da_fkey FOREIGN KEY (creata_da) REFERENCES public.utenti(id);


--
-- Name: task task_task_collegata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_task_collegata_id_fkey FOREIGN KEY (task_collegata_id) REFERENCES public.task(id);


--
-- Name: task task_task_madre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_task_madre_id_fkey FOREIGN KEY (task_madre_id) REFERENCES public.task(id);


--
-- Name: task task_utente_assegnato_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_utente_assegnato_fkey FOREIGN KEY (utente_assegnato) REFERENCES public.utenti(id);


--
-- Name: timesheet timesheet_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.timesheet
    ADD CONSTRAINT timesheet_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id);


--
-- Name: timesheet timesheet_utente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: team_user
--

ALTER TABLE ONLY public.timesheet
    ADD CONSTRAINT timesheet_utente_id_fkey FOREIGN KEY (utente_id) REFERENCES public.utenti(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 3yF80Q7GAOAhMdd87HuPdDxgL50BAe4XxeOkctoxvmRzEIkTra6DcDhWbofVaJe

