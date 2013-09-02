CREATE TABLE participants (
	id integer PRIMARY KEY NOT NULL,
	alias varchar(255) NOT NULL UNIQUE,
	picture varchar(255),
	name varchar(255)
);