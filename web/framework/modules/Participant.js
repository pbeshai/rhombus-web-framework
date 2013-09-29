/**

	A participant (e.g., a clicker user)

*/
define([
	// Application.
	"framework/App",
],

function (App) {

	var Participant = App.module();

	Participant.Model = Backbone.Model.extend({
		urlRoot: "/api/participants",


		defaults: {
			"choice": null,
			// "played": false, // TODO: Commented out until tested (moved into reset)
			// "validChoices": null // if null, all choices are accepted
		},

		toJSON: function () {
			var result = Backbone.Model.prototype.toJSON.call(this);

			// prevent infinite recursion due to circular reference.
			if (result.partner) {
				result.partner = result.partner.get("alias");
			}
			if (result.partnerBackward) {
				result.partnerBackward = result.partnerBackward.get("alias");
			}

			return result;
		},

		initialize: function () {
		},

		// resets choice related attributes (retains alias)
		reset: function () {
			// TODO: look into possibly unsetting these instead so we don't send excess data over the socket
			this.set({
				"choice": null,
				"played": false,
				"validChoices": null // if null, all choices are accepted
			}, { silent: true });
		},

		validate: function (attrs, options) {
			if (_.isEmpty(attrs.alias)) {
				return "cannot have empty alias";
			}

			if (attrs.choice != null && this.get("validChoices") != null && !_.contains(this.get("validChoices"), attrs.choice)) {
				var msg = "invalid choice " + attrs.choice + ", valid choices are " + this.get("validChoices").join(", ");
				return msg;
			}
		}
	});

	Participant.Bot = Participant.Model.extend({
		bot: true,

		initialize: function () {
			Participant.Model.prototype.initialize.call(this);
			if (this.get("alias") === undefined) {
				this.set("alias", "bot");
			}

			// short delay before playing
			// this.delayedPlay(); // TODO: see what this breaks now that it is commentd out
		},

		save: function () {
			console.log("trying to save bot");
			return false;
		},

		sync: function () {
			console.log("trying to sync bot");
			return false;
		},

		fetch: function () {
			console.log("trying to fetch bot");
			return false;
		},

		destroy: function () {
			console.log("trying to destroy bot");
			return false;
		},

		delayedPlay: function () {
			setTimeout(_.bind(this.play, this), 50);
		},

		play: function () {
			var choices = this.get("validChoices");
			var choice = choices[Math.min(Math.floor(Math.random() * choices.length), choices.length - 1)];
			this.set("choice", choice);
		}
	});


	Participant.Collection = Backbone.Collection.extend({
		url: "/api/participants",
		model: Participant.Model,
		comparator: "alias",
		aliasMap: {},
		defaults: {
			validateOnChoice: true
		},

		initialize: function (models, options) {
			_.bind(this.updateFromServer, this);
			this.newParticipants = [];
			this.options = options = _.extend({}, this.defaults, options);

			// initialize alias->model map
			this.initAliasMap(models);

			this.on("reset", this.onReset);
			this.on("add", this.addCallback);
			this.on("remove", this.removeCallback);
		},

		// update choices from ParticipantServer
		updateFromServer: function (data) {
			_.each(data.choices, function (choiceData, i) {
				var model = this.aliasMap[choiceData.id];
				if (model && model !== "queued") {
					model.set({ "choice": choiceData.choice }, { validate: this.options.validateOnChoice });
					this.trigger("update:choice", model, choiceData.choice); // slightly different from change:choice since it is fired even if the choice is unchanged.
				} else if (model !== "queued") {
					model = new Participant.Model({ alias: choiceData.id, choice: choiceData.choice });
					this.queueNewParticipant(model);
				}
			}, this);
		},

		// update participants from manager
		update: function (data) {
			_.each(data, function (participant, i) {
				var model = this.aliasMap[participant.alias];
				participant = _.clone(participant); // ensure we do not modify the passed in data

				// handle partners as a special case (interpret from alias to reference)
				if (model) {
					if (participant.partner) {
						participant.partner = this.aliasMap[participant.partner];
					}

					if (participant.partnerBackward) {
						participant.partnerBackward = this.aliasMap[participant.partnerBackward];
					}

					model.set(participant, { validate: this.options.validateOnChoice, silent: true });
					model.trigger("change", model, participant);
				} else {
					console.log("adding new user");
					model = new Participant.Model(participant);
					this.add(model);
				}
			}, this);
			this.trigger("update", this, data);
		},

		// restores from a JSON snapshot
		restore: function (snapshot) {
			// TODO: this probably needs to remove participants

			// clear attributes in each model
			_.each(snapshot, function (participant, i) {
				var model = this.aliasMap[participant.alias];

				model.clear();
			}, this);


			// treat it as an update
			this.update(snapshot);
		},

		// saves models without ids to database
		saveNew: function () {
			var newParticipants = this.filter(function (participant) {
				return participant.get("id") === undefined;
			});

			if (newParticipants.length) {
				var newToSave = new Participant.Collection(newParticipants);

				console.log("saving new participants", newParticipants);
				return Backbone.sync("create", newToSave, {
					url: this.url,
					success: function () { newToSave.reset(); },
					error: function () { newToSave.reset(); }
				});
			}
		},

		newParticipantsCount: function () {
			return this.newParticipants.length;
		},

		queueNewParticipant: function (model) {
			// if we do not add something to the alias map, the new participant will be added repeatedly
			this.aliasMap[model.get("alias")] = "queued";
			this.newParticipants.push(model);
			this.trigger("new-queued", model, this);
		},

		hasNewParticipants: function () {
			return this.newParticipants.length > 0;
		},

		addNewParticipants: function () {
			this.add(this.newParticipants);
			var newParticipants = this.newParticipants.slice(0); // copy
			this.newParticipants.length = 0; // 'remove' all elements from array without destroying any references to it
			this.trigger("new-added", newParticipants, this); // TODO: see if anyone is using this
			return newParticipants;
		},

		clearNewParticipants: function () {
			var newParticipants = this.newParticipants.slice(0); // copy
			this.newParticipants.length = 0; // 'remove' all elements from array without destroying any references to it
			return newParticipants;
		},

		addCallback: function (model) {
			this.aliasMap[model.get("alias")] = model;
		},

		removeCallback: function (model) {
			delete this.aliasMap[model.get("alias")];
		},

		onReset: function (models) {
			this.newParticipants.length = 0;
			this.initAliasMap(models);
		},

		initAliasMap: function (models) {
			this.aliasMap = {};
			if (_.isArray(models)) {
				_.each(models, setAlias, this);
			} else {
				this.each(setAlias, this);
			}

			function setAlias(model) {
				var alias = model.get("alias");
				if (alias !== undefined) {
					this.aliasMap[alias] = model;
				}
			}
		},

		findByAlias: function (alias) {
			return this.aliasMap[alias];
		},

		// matches each model with another, but not in a symmetric way.
		// e.g. A -> B -> C -> A  :: (A,B), (B,C), (C,A)
		pairModelsAsymmetric: function (models) {
			if (!_.isArray(models)) {
				models = this.models;
			}

			var indices = [];
			_.each(models, function (model, i) { indices[i] = i; });
			indices = _.shuffle(indices);

			if (indices.length < 2) {
				console.log("less than two models");
			} else {
				for(var i = 0; i < indices.length; i ++) {
					models[indices[i]].set("partner", models[indices[(i+1) % indices.length]]);
					models[indices[(i+1) % indices.length]].set("partnerBackward", models[indices[i]]);
				}
			}
		},

		// put all the models into pairs
		pairModels: function (models) {
			if (!_.isArray(models)) {
				models = this.models;
			}

			var indices = [];
			_.each(models, function (model, i) { indices[i] = i; });
			indices = _.shuffle(indices);

			if (indices.length < 2) {
				console.log("less than two models");
			} else {
				for(var i = 0; i < (indices.length - (indices.length % 2)); i += 2) {
					models[indices[i]].set("partner", models[indices[i+1]]);
					models[indices[i+1]].set("partner", models[indices[i]]);
				}

				if (indices.length % 2 == 1) {
					console.log("uneven number of models, one model with no partner: " + models[indices[indices.length-1]].get("alias"));
				}
			}
		},

		addBot: function () {
			this.add(new Participant.Bot());
		},

		bucket: function (bucketAttribute, numBuckets) {
			bucketAttribute = bucketAttribute ? bucketAttribute : "score";
			numBuckets = numBuckets ? numBuckets : 6;

			var bucketScores = this.map(function (participant) { return participant.get(bucketAttribute); }, this);
			var min = _.min(bucketScores), max = _.max(bucketScores);

			this.each(function (participant) {
				var score = participant.get(bucketAttribute);
				var bucket = Math.floor(((score - min) / (max - min)) * numBuckets);
				if (isNaN(bucket)) {
					bucket = Math.floor(numBuckets / 2);
				}
				participant.set("bucket", bucket);
			});
		}
	});

	Participant.Util = {};
	// participants is the an array of objects (basically from Participant.Collection.toJSON())
	// partners have been replaced by their alias and need their references replaced
	Participant.Util.collectionFromJSON = function (participants) {
		var models = _.map(participants, function (p) { return new Participant.Model(p); });

		var collection = new Participant.Collection(models);

		// convert partner from alias to reference
		collection.each(function (p) {
			if (p.get("partner")) {
				p.set("partner", collection.findByAlias(p.get("partner")));
			}

			if (p.get("partnerBackward")) {
				p.set("partnerBackward", collection.findByAlias(p.get("partnerBackward")));
			}
		});

		return collection;
	};

	Participant.Views.Item = App.BaseView.extend({
		template: "framework/templates/participant/item",

		serialize: function () {
			return { model: this.model };
		},

		initialize: function () {
			this.listenTo(this.model, "change", this.render);
		}
	});

	Participant.Views.List = App.BaseView.extend({
		template: "framework/templates/participant/list",


		beforeRender: function () {
			this.collection.each(function (participant) {
				this.insertView(".participant-list", new Participant.Views.Item({ model: participant }));
			}, this);
		},

		initialize: function () {
			this.listenTo(this.collection, {
				"reset": this.render,

				"fetch": function () {
					console.log("Fetch participants???");
				}
			});
		}

	});

	Participant.Views.TableItem = App.BaseView.extend({
		template: "framework/templates/participant/table_item",
		tagName: "tr",

		serialize: function () {
			return {
				model: this.model,
				showChoice: this.options.showChoice
			};
		},

		initialize: function () {
			this.listenTo(this.model, "change", this.render);
		}
	});

	Participant.Views.Table = App.BaseView.extend({
		template: "framework/templates/participant/table",

		serialize: function () {
			return {
				collection: this.collection,
				showChoice: this.options.showChoice
			};
		},

		beforeRender: function () {
			this.collection.each(function (participant) {
				this.insertView("tbody", new Participant.Views.TableItem({ model: participant, showChoice: this.options.showChoice }));
			}, this);
		},

		initialize: function () {
			this.listenTo(this.collection, {
				"reset": this.render,

				"fetch": function () {
					console.log("Fetch participants???");
				}
			});
		}

	});

	return Participant;
});