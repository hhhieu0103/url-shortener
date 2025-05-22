CREATE EXTENSION "uuid-ossp";

CREATE TABLE original_url
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    url text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT original_url_pkey PRIMARY KEY (id),
    CONSTRAINT original_url_url_key UNIQUE (url)
);

CREATE TABLE short_url
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    code character(8) COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    expired_at timestamp without time zone NOT NULL DEFAULT (now() + '24:00:00'::interval),
    click_count integer NOT NULL DEFAULT 0,
    original_id uuid NOT NULL,
    CONSTRAINT short_url_pkey PRIMARY KEY (id),
    CONSTRAINT short_url_original_id_fkey FOREIGN KEY (original_id)
        REFERENCES original_url (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

