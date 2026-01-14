--
-- PostgreSQL database dump
--

\restrict RLpgWkLWdUcSvnFziUZpqIiwBeF3sLlABNOJx67muOecElbjs3292u0s31aCbCZ

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
    'completata'
);


ALTER TYPE public.stato_attivita OWNER TO team_user;

--
-- Name: stato_task; Type: TYPE; Schema: public; Owner: team_user
--

CREATE TYPE public.stato_task AS ENUM (
    'programmata',
    'in_esecuzione',
    'completata'
);


ALTER TYPE public.stato_task OWNER TO team_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assegnazioni_attivita; Type: TABLE; Schema: public; Owner: team_user
--

CREATE TABLE public.assegnazioni_attivita (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    attivita_id uuid NOT NULL,
    utente_id uuid NOT NULL,
    data_assegnazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    data_assegnazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    creata_da uuid NOT NULL
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
    creata_da uuid NOT NULL
);


ALTER TABLE public.task OWNER TO team_user;

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
    data_registrazione timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.timesheet OWNER TO team_user;

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
-- Data for Name: assegnazioni_attivita; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.assegnazioni_attivita (id, attivita_id, utente_id, data_assegnazione) FROM stdin;
9dec6867-a889-41d5-9535-0928f8841890	9942c8ec-f3f9-453a-9d49-8842b5e02197	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:13:14.233488
a1a1e370-1c64-415e-aaa3-841ead76e37f	ce7b9d16-e0d4-4453-8325-5958e63f7561	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:13:14.233488
34d2f92a-8bed-48e4-b0ff-7450efc6365a	928f118a-4b00-4cfc-8fc3-036478095388	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:13:14.233488
\.


--
-- Data for Name: assegnazioni_progetto; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.assegnazioni_progetto (id, progetto_id, utente_id, ore_assegnate, data_assegnazione) FROM stdin;
ee7faae4-f8bf-400d-9780-8162cbdbb388	902bd953-80ed-4b5e-b1f6-c3980b8810d6	88e88c2b-f1ec-4a97-9143-2033e7476626	1000	2026-01-14 15:13:14.219466
\.


--
-- Data for Name: attivita; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.attivita (id, nome, descrizione, progetto_id, ore_stimate, ore_effettive, stato, scadenza, data_creazione, data_aggiornamento, creata_da) FROM stdin;
9942c8ec-f3f9-453a-9d49-8842b5e02197	Setup Iniziale	Configurazione ambiente e setup progetto	902bd953-80ed-4b5e-b1f6-c3980b8810d6	480	0	completata	2026-01-21 15:09:19.301763	2026-01-14 15:09:19.301763	2026-01-14 15:09:19.301763	88e88c2b-f1ec-4a97-9143-2033e7476626
ce7b9d16-e0d4-4453-8325-5958e63f7561	Sviluppo Frontend	Creazione interfaccia utente React	902bd953-80ed-4b5e-b1f6-c3980b8810d6	960	0	in_esecuzione	2026-01-28 15:09:19.301763	2026-01-14 15:09:19.301763	2026-01-14 15:09:19.301763	88e88c2b-f1ec-4a97-9143-2033e7476626
928f118a-4b00-4cfc-8fc3-036478095388	Sviluppo Backend	API REST e database PostgreSQL	902bd953-80ed-4b5e-b1f6-c3980b8810d6	720	0	pianificata	2026-02-04 15:09:19.301763	2026-01-14 15:09:19.301763	2026-01-14 15:09:19.301763	88e88c2b-f1ec-4a97-9143-2033e7476626
\.


--
-- Data for Name: clienti; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.clienti (id, nome, descrizione, budget, budget_utilizzato, stato_approvazione, approvato_da, data_approvazione, creato_da, data_creazione, data_aggiornamento, attivo) FROM stdin;
06795d22-86d2-4e60-8e08-f9642163ae6a	Acme Corporation	Cliente principale per sviluppo software	100000.00	0.00	approvata	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:09:19.298257	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:09:19.298257	2026-01-14 15:09:19.298257	t
\.


--
-- Data for Name: progetti; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.progetti (id, nome, descrizione, cliente_id, budget_assegnato, budget_utilizzato, stato_approvazione, approvato_da, data_approvazione, data_inizio, data_fine, scadenza, creato_da, data_creazione, data_aggiornamento, attivo) FROM stdin;
902bd953-80ed-4b5e-b1f6-c3980b8810d6	Sistema Management	Sviluppo sistema gestione team	06795d22-86d2-4e60-8e08-f9642163ae6a	50000.00	0.00	approvata	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:09:19.299999	2026-01-14	2026-07-14	\N	88e88c2b-f1ec-4a97-9143-2033e7476626	2026-01-14 15:09:19.299999	2026-01-14 15:09:19.299999	t
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.task (id, nome, descrizione, attivita_id, utente_assegnato, ore_stimate, ore_effettive, stato, scadenza, task_collegata_id, task_madre_id, data_creazione, data_completamento, data_aggiornamento, creata_da) FROM stdin;
c30872aa-d83e-4992-a428-9374dddf2ba2	asdasdas	asdasda	9942c8ec-f3f9-453a-9d49-8842b5e02197	88e88c2b-f1ec-4a97-9143-2033e7476626	5	15	completata	2026-01-14 18:00:00	\N	\N	2026-01-14 15:27:39.569838	\N	2026-01-14 15:27:48.835505	88e88c2b-f1ec-4a97-9143-2033e7476626
0c2983d5-7c16-44a0-bdd8-99a24e1ccc62	asdasdasda	asdasdasdadsa	9942c8ec-f3f9-453a-9d49-8842b5e02197	88e88c2b-f1ec-4a97-9143-2033e7476626	5	60	completata	2026-01-14 18:00:00	\N	\N	2026-01-14 16:05:52.118282	\N	2026-01-14 16:06:17.865105	88e88c2b-f1ec-4a97-9143-2033e7476626
7aad42bb-e865-4ece-bcbd-bd3ebd489273	prova task scadenza breve	asdasdas	ce7b9d16-e0d4-4453-8325-5958e63f7561	88e88c2b-f1ec-4a97-9143-2033e7476626	15	\N	programmata	2026-01-15 18:00:00	\N	\N	2026-01-14 16:33:46.157402	\N	2026-01-14 16:33:46.157402	88e88c2b-f1ec-4a97-9143-2033e7476626
a5be5385-0278-4f4c-a342-da40535c4e82	prova task scadenxa oggi	asdasdsad	928f118a-4b00-4cfc-8fc3-036478095388	88e88c2b-f1ec-4a97-9143-2033e7476626	5	\N	programmata	2026-01-14 18:00:00	\N	\N	2026-01-14 16:34:02.033292	\N	2026-01-14 16:34:02.033292	88e88c2b-f1ec-4a97-9143-2033e7476626
\.


--
-- Data for Name: timesheet; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.timesheet (id, utente_id, task_id, data, ore_lavorate, descrizione, data_registrazione) FROM stdin;
\.


--
-- Data for Name: utenti; Type: TABLE DATA; Schema: public; Owner: team_user
--

COPY public.utenti (id, nome, email, password_hash, ruolo, compenso_annuale, costo_orario, attivo, data_creazione, data_aggiornamento, ore_disponibili_anno, costo_orario_manuale, ore_disponibili_manuale) FROM stdin;
3b80691f-07ee-47ed-ad93-729aace6b52f	Mario Rossi	mario@team.com	$2b$12$LQv3c1yqBwlVHpPjrPyFUOHXfxvxUDAHL.UkeF/An4U16Q3HDbLHG	risorsa	35000.00	15.91	t	2026-01-14 14:45:48.259297	2026-01-14 14:45:48.259297	1760	f	f
a70a2261-a145-4239-bd38-157139f9e02a	Test Manager	test@team.com	$2b$10$vI8aWBnW3fID.w.mscgPmOKpP6.zYb8YXm9K0w9j0u9K9U9gJWWZu	manager	50000.00	22.73	t	2026-01-14 14:55:42.783015	2026-01-14 14:55:42.783015	1760	f	f
1d237e1b-58c0-4e42-bcf3-36799a64c074	Manager Sistema	manager@team.com	$2b$10$N9qo8uLOickgx2ZMRZoMye5pO6laQhUzwQUGgvxVc5oq0S/46SQMq	manager	50000.00	22.73	t	2026-01-14 14:45:48.259297	2026-01-14 14:45:48.259297	1760	f	f
88e88c2b-f1ec-4a97-9143-2033e7476626	Test Manager	testmanager@team.com	$2a$12$38PfmzO58oZTxUMb1SR1YuTnW2NG3U4JTQHq45RPCqVtHwrHpu4a2	manager	50000.00	45.45	t	2026-01-14 14:59:41.710699	2026-01-14 15:04:15.562392	1760	f	f
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
-- Name: idx_attivita_progetto_id; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_attivita_progetto_id ON public.attivita USING btree (progetto_id);


--
-- Name: idx_progetti_cliente_id; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_progetti_cliente_id ON public.progetti USING btree (cliente_id);


--
-- Name: idx_task_attivita_id; Type: INDEX; Schema: public; Owner: team_user
--

CREATE INDEX idx_task_attivita_id ON public.task USING btree (attivita_id);


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

\unrestrict RLpgWkLWdUcSvnFziUZpqIiwBeF3sLlABNOJx67muOecElbjs3292u0s31aCbCZ

