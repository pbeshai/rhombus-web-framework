CREATE TABLE participants (
	id integer PRIMARY KEY NOT NULL,
	alias varchar(255) NOT NULL UNIQUE,
	serverId varchar(255) NOT NULL UNIQUE
);

INSERT INTO participants (alias, serverId) VALUES ("pbeshai", "Peter"), ("beshai", "Beshai");